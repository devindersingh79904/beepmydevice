#!/bin/sh
#
# Container entrypoint: migrate, then serve.
#
# The image used to start Uvicorn directly, which works on a database that
# already has the schema and fails confusingly on one that does not — a fresh
# deploy came up healthy and then 500'd on the first query, with the real
# cause ("relation \"users\" does not exist") buried in a stack trace.
#
# Running `alembic upgrade head` here means the schema is a property of the
# deployment rather than a step someone has to remember. It is safe to repeat:
# Alembic is a no-op when the database is already at head.
#
# This is only correct because the API runs as a SINGLE instance (see the
# Dockerfile's CMD for why it has to). Two containers starting at once would
# both try to migrate; Postgres holds a lock so one would win rather than
# corrupt anything, but the loser can fail its start. When Redis lands and
# this scales out, migrations move to a release phase of their own.

set -eu

# Off by default, and that default is deliberate: docs/DEPLOYMENT.md chose to
# run migrations as an explicit step rather than on boot, because a container
# that crash-loops would otherwise retry the same migration on every restart.
#
# Compose turns it on (RUN_MIGRATIONS=true) because a fresh `up` against an
# empty volume otherwise starts an API with no tables, which comes up healthy
# and then 500s on the first query — the real cause buried in a stack trace.
#
# For a production deploy, leave it unset and run the documented step:
#   docker compose exec api python -m alembic upgrade head
if [ "${RUN_MIGRATIONS:-false}" != "true" ]; then
    echo "[entrypoint] RUN_MIGRATIONS is not 'true'; skipping migrations"
    exec "$@"
fi

echo "[entrypoint] running database migrations"

# Retry briefly: on a compose start or a platform deploy the database can
# accept TCP before it is ready for queries, and a hard failure here would
# crash-loop the container for a condition that resolves itself in seconds.
attempt=1
max_attempts=10

until python -m alembic upgrade head; do
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "[entrypoint] migrations failed after ${max_attempts} attempts" >&2
        exit 1
    fi
    echo "[entrypoint] migration attempt ${attempt} failed, retrying in 3s" >&2
    attempt=$((attempt + 1))
    sleep 3
done

echo "[entrypoint] migrations applied; starting the API"

# exec, so Uvicorn becomes PID 1 and receives SIGTERM directly. Without it the
# shell holds PID 1, swallows the signal, and every deploy waits out the
# platform's kill timeout instead of shutting down cleanly.
exec "$@"
