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
- `podman/` — the Podman + systemd (Quadlet) deployment target; see [podman/README.md](podman/README.md).

## Deployment variants (ADR 0002)

Two supported targets share the same images (`apps/api/Dockerfile`,
`apps/web/Dockerfile`), env contract, and reverse-proxy expectation — keep them
in sync when the runtime shape changes:

- **Docker Compose** — `docker-compose.yml` (default; also runs under
  `podman compose`). Runbook below.
- **Podman + systemd (Quadlet)** — `podman/` (current Oracle target;
  reboot-safe). Runbook in [podman/README.md](podman/README.md).

## Docker Compose deploy (runbook)

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
- **Oracle Podman logging:** the current Oracle runtime is rootful Podman, not
  Docker Compose. When recreating `psa-db`, `psa-api`, or `psa-web`, do not
  keep the default `journald` log driver. `conmon` records container stderr as
  journal priority 3, so normal PostgreSQL/nginx/Prisma startup or deprecation
  messages appear in `journalctl -p err..alert` even when the stack is healthy.
  During the next controlled deploy/recreate, prefer file-backed container logs,
  for example `--log-driver=k8s-file --log-opt max-size=10mb`, while preserving
  container names, ports, volumes, restart policy, and Caddy routing. Confirm
  that `podman logs <container>` still works and that log size limits are in
  place. If a file log driver is unsuitable, redirect only normal startup/info
  application output away from stderr; real errors must remain visible. Do not
  perform an in-place container tweak only to reduce journal noise.
- **Oracle post-recreate checks:** after any Podman recreate, verify
  `podman ps`, local health endpoints, public HTTPS endpoints, HTTP-to-HTTPS
  redirect, and `journalctl -b -p err..alert`.
- **Restricted/proxied networks:** if the build host routes egress through a
  TLS-intercepting proxy, the in-container package downloads need that proxy's
  CA — pass it via `NODE_EXTRA_CA_CERTS` at build time. Do not commit it.
- **Secrets** never go in the repository; only `deploy/.env` (git-ignored).
