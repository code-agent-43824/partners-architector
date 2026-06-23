# deploy/

Application/runtime configuration for the self-hosted psa stack. This is
product/runtime configuration, **not** a release pipeline — production deploys
are manual and performed only by Watson (see `AGENTS.md`). Do not add CI/CD
release automation, deploy keys, or server credentials here.

## Contents

- `docker-compose.yml` — the stack: `db` (PostgreSQL 16 + pgvector), `api`
  (NestJS; applies migrations on start), `web` (SPA via nginx, proxies `/api`
  to the api). A TLS reverse proxy (Caddy/nginx) is added in front for
  production (spec §7.6).
- `.env.example` — copy to `deploy/.env` (git-ignored) and fill in.
- `db/init/` — first-boot SQL (enables the `vector` extension on a fresh volume).

## First test deploy (runbook)

From the repository root, with `COMPOSE="docker compose --env-file deploy/.env -f deploy/docker-compose.yml"`:

1. `cp deploy/.env.example deploy/.env`, then set at least:
   - `POSTGRES_PASSWORD` — strong value.
   - `AUTH_JWT_SECRET` — long random (e.g. `openssl rand -hex 32`). Required even
     to start only `db` (compose interpolates the `api` service).
   - `AUTH_COOKIE_SECURE` — `true` behind TLS (production), `false` for a plain
     HTTP test deploy.
   - Optional `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` to bootstrap an admin.
2. `$COMPOSE up -d --build` — builds and starts db, api (auto-migrates), web.
3. `$COMPOSE exec api pnpm --filter @psa/api db:seed` — load the 30 question
   blocks + carriers (idempotent; run once).
4. Open `http://<host>:${WEB_PORT:-8080}` — register/log in as an architect.
5. `$COMPOSE logs -f api` / `$COMPOSE ps` to check health; `$COMPOSE down`
   to stop (`down -v` also drops the database volume).

### Notes

- **TLS:** terminate TLS at a reverse proxy (Caddy/nginx) in front of `web`
  for production, and set `AUTH_COOKIE_SECURE=true`. Not included here yet.
- **Restricted/proxied networks:** if the build host routes egress through a
  TLS-intercepting proxy, the in-container package downloads need that proxy's
  CA — pass it via `NODE_EXTRA_CA_CERTS` at build time. Do not commit it.
- **Secrets** never go in the repository; only `deploy/.env` (git-ignored).
