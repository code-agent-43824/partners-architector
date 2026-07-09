# E2E smoke suite

`pnpm test:e2e` runs the committed Watson smoke suite against a disposable
PostgreSQL/pgvector database:

1. starts `db` from `deploy/docker-compose.yml` under a unique Compose project
   when Docker Compose or Podman Compose is available; otherwise it falls back
   to a plain disposable Podman container with the same `pgvector/pgvector:pg16`
   image and init scripts;
2. runs Prisma migrations and the normal seed;
3. builds and starts the API locally with a generated registration code;
4. asserts the critical product path: auth, registration gate, CSRF, ownership
   isolation, partnerships CRUD, partner cap/reorder, sessions, clause
   instantiation/status rules, capture, sign-offs, versions, structured shares,
   and agreement assembly;
5. removes the Compose project and database volume.

The suite requires Docker Compose, Podman Compose, or Podman. Set
`PSA_E2E_SKIP_API_BUILD=1` to reuse an already-built API. PDF/DOCX export is not
run by default because local host runs may not have Chromium installed; keep
export checks in production smoke until the API image is exercised directly.
