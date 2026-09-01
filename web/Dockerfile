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
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# `wget --spider` rather than curl: curl is not in nginx:alpine, and a health
# check that fails because its own binary is missing is worse than none.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
