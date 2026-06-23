# deploy/podman/ — Podman + systemd (Quadlet) target

The Podman deployment target (ADR 0002), used on the Oracle host where Docker
is not installed. Same OCI images and env contract as the Docker Compose
target (`../docker-compose.yml`); here containers are supervised by systemd via
Quadlet, so they survive reboots without a separate restart service.

Units (installed into `/etc/containers/systemd/` for rootful):

- `psa.network` — private network `psa`.
- `psa-db.container` — PostgreSQL 16 + pgvector, volume `psa_pgdata`.
- `psa-api.container` — NestJS API (applies migrations on start).
- `psa-web.container` — nginx serving the SPA, proxies `/api` to `psa-api`,
  published on `127.0.0.1:8080` for the host reverse proxy.

## Runbook (rootful)

From a checkout of `main` on the host:

1. **Secrets** — create `/etc/partners-architector/psa.env` (mode `600`, not in
   the repo) with the variables from [`../.env.example`](../.env.example):
   `POSTGRES_USER=psa`, `POSTGRES_PASSWORD=…`, `POSTGRES_DB=psa`,
   `DATABASE_URL=postgresql://psa:…@db:5432/psa`, `AUTH_JWT_SECRET=…`,
   `AUTH_COOKIE_SECURE=true` (behind TLS), and optionally
   `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD`.
2. **Build the images** (build context = repo root):
   ```sh
   podman build -f apps/api/Dockerfile -t localhost/psa-api:latest .
   podman build -f apps/web/Dockerfile -t localhost/psa-web:latest .
   ```
3. **Install the units**: copy `psa.network` and the three `*.container` files
   into `/etc/containers/systemd/`, then `systemctl daemon-reload`.
4. **Start**: `systemctl start psa-web` (pulls in `psa-api` → `psa-db` via
   `Requires=`). Enable on boot is implicit via `[Install] WantedBy=` once
   `daemon-reload` generates the services.
5. **Seed once**: `podman exec psa-api pnpm --filter @psa/api db:seed`.
6. **Reverse proxy**: point Caddy at the web container, e.g.
   ```
   partners-architector.duckdns.org {
       reverse_proxy 127.0.0.1:8080
   }
   ```
   Caddy provisions HTTPS and redirects HTTP→HTTPS.
7. **Verify**: `https://<host>/` → 200, `/api/health` and `/api/health/db` →
   `{"status":"ok"}`, HTTP → 308.

Updates: rebuild the image(s), then `systemctl restart psa-api psa-web` (the
api re-applies migrations on start). Keep this target in sync with
`../docker-compose.yml` whenever the runtime shape changes (ADR 0002).

> Quick alternative (non-systemd): `podman compose -f ../docker-compose.yml …`
> runs the Compose target directly under Podman. The Quadlet units above are
> the supervised, reboot-safe production form.
