# syntax=docker/dockerfile:1
#
# psa web image: build the SPA, then serve the static files with nginx and
# proxy /api to the api service. Build context is the repository root:
#   docker build -f apps/web/Dockerfile -t psa-web .
FROM node:22-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY . .
# Install only what @psa/web needs (no api/native deps) and build the SPA.
RUN pnpm install --frozen-lockfile --filter @psa/web... \
  && pnpm --filter @psa/web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
