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

## Oracle database backups

The current Oracle host keeps server-local PostgreSQL backups outside the
repository:

- Script: `/opt/partners-architector/bin/backup-db.sh` (root-owned, mode
  `0750`).
- Backup directory: `/opt/partners-architector/backups` (root-owned, mode
  `0700`).
- Schedule: `/etc/cron.d/partners-architector-db-backup`, daily at 02:17 UTC.
- Format: `pg_dump --format=custom --no-owner --no-acl` from the live
  `psa-db` container, written atomically as `psa-YYYYMMDDTHHMMSSZ.dump` plus a
  `.sha256` sidecar.
- Retention: files older than 14 days are removed by the script.

Backups are operational artifacts. They must not be committed, copied into
release tarballs, or pasted into chats. The backup script intentionally reads
the database name/user from the running `psa-db` container and does not print
passwords or `DATABASE_URL`.

### Restore test runbook

Never restore into the live `psa-db` container unless the owner explicitly asks
for disaster recovery. Test restores use a separate scratch container:

```sh
BACKUP_DIR=/opt/partners-architector/backups
BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'psa-*.dump' -printf '%T@ %f\n' | sort -n | tail -1 | awk '{print $2}')

cd "$BACKUP_DIR"
sha256sum -c "$BACKUP.sha256"

TEST="psa-restore-test-$(date -u +%Y%m%d%H%M%S)"
RESTORE_PASSWORD="$(openssl rand -hex 24)"

podman run -d --rm --name "$TEST" --network psa-net \
  -e POSTGRES_USER=psa_restore \
  -e POSTGRES_PASSWORD="$RESTORE_PASSWORD" \
  -e POSTGRES_DB=psa_restore \
  -v "$BACKUP_DIR:/backups:ro" \
  docker.io/pgvector/pgvector:pg16

for i in $(seq 1 45); do
  podman exec "$TEST" pg_isready -U psa_restore >/dev/null 2>&1 && break
  sleep 1
done

podman exec "$TEST" sh -lc 'createdb -U "$POSTGRES_USER" "$POSTGRES_DB" 2>/dev/null || true'
podman exec "$TEST" pg_restore -U psa_restore -d psa_restore --no-owner --no-acl "/backups/$BACKUP"

SQL="analyze; select concat(relname, chr(61), n_live_tup) from pg_stat_user_tables order by relname;"
podman exec psa-db sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Atc \"$SQL\"" | sort
podman exec "$TEST" sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Atc \"$SQL\"" | sort

podman rm -f "$TEST"
```

The two count lists should match. If they do not, keep the scratch container
for inspection and do not touch the live database until the mismatch is
understood.

### Disk encryption status

Watson checked the Oracle host on 2026-07-02. From inside the guest OS, the
database volume is stored under `/var/lib/containers/storage/volumes/psa_pgdata`
on `/dev/mapper/ocivolume-root` (`xfs`) backed by a plain LVM linear mapping on
`sda3`; `blkid` showed no `crypto_LUKS`, and `cryptsetup status` reported
`type: n/a`. In other words, no host-level LUKS/dm-crypt layer is visible for
the DB volume. OCI-managed block-volume encryption, if required for SEC-6,
must be verified in the OCI console or tenancy settings because it is not
observable from this guest-level check.

## Docker Compose deploy (runbook)

From the repository root, with `COMPOSE="docker compose --env-file deploy/.env -f deploy/docker-compose.yml"`:

1. `cp deploy/.env.example deploy/.env`, then set at least:
   - `POSTGRES_PASSWORD` — strong value.
   - `AUTH_JWT_SECRET` — long random (e.g. `openssl rand -hex 32`). Required even
     to start only `db` (compose interpolates the `api` service).
   - `AUTH_COOKIE_SECURE` — `true` behind TLS (production), `false` for a plain
     HTTP test deploy.
   - Optional `AUTH_REGISTRATION_CODE` — when set, self-service
     `POST /auth/register` requires this shared code. Set it on public
     production hosts.
   - Optional `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` to bootstrap an admin.
2. `$COMPOSE up -d --build` — builds and starts db, api (auto-migrates), web.
3. `$COMPOSE exec api pnpm --filter @psa/api db:seed` — load the 30 question
   blocks + carriers (idempotent; run once).
4. Open `http://<host>:${WEB_PORT:-8080}` — register/log in as an architect.
5. `$COMPOSE logs -f api` / `$COMPOSE ps` to check health; `$COMPOSE down`
   to stop (`down -v` also drops the database volume).

Before a production deploy, Watson should run the normal local checks plus the
committed smoke suite where Docker/Podman Compose or Podman is available:
`pnpm test:e2e`. The e2e runner creates its own disposable database, then
migrates, seeds, starts the API locally, asserts the critical API path, and
tears everything down.

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
