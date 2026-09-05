"""alert-on-silent preference

Adds users.alert_on_silent: whether this user's devices should be audible when
the phone's ringer is silenced.

The value is read at push time to choose an Android notification channel. A
channel's importance and audio attributes are immutable once the system has
created it, so "silent-override" and "normal" have to be two channels declared
by the app, and the server picks between them per alert.

Non-nullable, defaulting to false. Overriding a user's silent switch is a thing
they opt into; existing accounts must not start doing it because a column
appeared.

Revision ID: c4d9e2b71a05
Revises: b7c2f1a94e30
Create Date: 2026-09-05 13:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4d9e2b71a05"
down_revision: str | None = "b7c2f1a94e30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply this migration."""
    op.add_column(
        "users",
        sa.Column(
            "alert_on_silent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    """Revert this migration."""
    op.drop_column("users", "alert_on_silent")
