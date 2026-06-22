# deploy/

Application runtime configuration for self-hosted deployment: the
`docker-compose.yml` dev/runtime stack (PostgreSQL + pgvector, api, web),
`.env.example`, and reverse-proxy config.

This is product/runtime configuration, **not** a release pipeline. Production
deploys remain manual and are performed only by Watson (see `AGENTS.md`); do
not add CI/CD release automation, deploy keys, or server credentials here.

Populated in Phase 0 step 0.2. Empty in step 0.1.
