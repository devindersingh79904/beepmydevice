# check=skip=SecretsUsedInArgOrEnv
#
# That check fires on the VITE_FIREBASE_* build args below, because their names
# contain API_KEY and VAPID_KEY. They are not secrets and cannot be: Vite
# inlines every VITE_* variable into the JavaScript bundle, so all of them are
# readable by anyone who loads the page. A Firebase web apiKey identifies the
# project to Google and is restricted by a domain allow-list, not by being
# hidden.
#
# Skipped deliberately rather than left to warn on every build — a warning
# nobody can action is one people learn to scroll past, including the time it
# is real. The actual secrets (the Firebase service-account private key, the
# JWT signing key, the APNs .p8) live in backend/.env and never reach a
# browser or this image.

# BeepMyDevice web dashboard.
#
# Two stages: Node builds the bundle, nginx serves it. The runtime image
# carries no Node, no node_modules and no source — about 50 MB against roughly
# 400 MB for a single-stage build, and nothing in it can execute JavaScript on
# the server.
#
#   docker build -t beepmydevice-web ./web
#   docker run -p 8080:80 beepmydevice-web
#
# Or through the compose file, which wires it to the API and the database:
#   docker compose -f docker/docker-compose.yml up --build

# --- build ------------------------------------------------------------------
# Pinned to a digest-stable minor rather than `lts`: a floating tag means two
# people building the same commit a month apart can get different bundles.
FROM node:20.11-alpine AS build

WORKDIR /app

# Dependencies first, as their own layer. Source changes far more often than
# package.json, so this layer is reused on almost every rebuild.
COPY package.json package-lock.json* ./

# `npm ci` when there is a lockfile — reproducible, and it fails loudly if the
# lockfile and package.json disagree. Falls back to `install` for a first
# build before a lockfile has been committed.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Vite inlines VITE_* at build time, so they are baked into the bundle here,
# not read at runtime. Both have working defaults (see src/config/env.ts), so
# a build with no build-args produces a dashboard that talks to /api/v1 and
# /ws/status on its own origin — which is exactly what the nginx config below
# proxies. Override only when the API is on another host.
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_VAPID_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

# `npm run build` typechecks before it bundles, so a type error fails the image
# rather than shipping.
RUN npm run build

# --- serve ------------------------------------------------------------------
FROM nginx:1.25-alpine AS serve

# nginx:alpine already runs worker processes as the unprivileged `nginx` user.
COPY --from=build /app/dist /usr/share/nginx/html

# Into templates/, not conf.d/: the base image runs envsubst over this on every
# start, so the API address is a deployment setting rather than something baked
# into the image at build time.
COPY templates/ /etc/nginx/templates/

# Where the API lives, as host:port. The default is the compose service name.
ENV API_UPSTREAM=api:8000

# Substitute ONLY variables starting API_. nginx's config is full of its own
# $-variables ($host, $remote_addr, $proxy_add_x_forwarded_for); without this
# filter envsubst replaces them with empty strings and every proxied request
# arrives with blank headers.
ENV NGINX_ENVSUBST_FILTER="^API_"

EXPOSE 80

# `wget --spider` rather than curl: curl is not in nginx:alpine, and a health
# check that fails because its own binary is missing is worse than none.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
