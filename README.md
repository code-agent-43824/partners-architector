# Partners Architector

Software product for designing, establishing, and developing business partnerships.

## Status

Active development. The MVP requirements are specified in [docs/spec/psa-mvp.md](docs/spec/psa-mvp.md); see [HANDOFF.md](HANDOFF.md) for live status. The codebase is a pnpm monorepo. **Phase 0 (skeleton & infrastructure) is complete:** the stack — web (React SPA) + API (NestJS) + PostgreSQL/pgvector — runs via Docker Compose with auth/RBAC and the seeded methodology.

Current public placeholder: <https://partners-architector.duckdns.org/>

## Development

Before making changes, read [AGENTS.md](AGENTS.md) — it defines the working rules for human and coding-agent contributors — and [HANDOFF.md](HANDOFF.md) for in-flight work. Common commands (Node 22, pnpm 10) live in [CLAUDE.md](CLAUDE.md): `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

### Running locally

- **Full stack (Docker):** `cp deploy/.env.example deploy/.env` (set `POSTGRES_PASSWORD` and `AUTH_JWT_SECRET`), then `docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build` and `… exec api pnpm --filter @psa/api db:seed`; open <http://localhost:8080>. Details and the deploy runbook: [deploy/README.md](deploy/README.md).
- **Front-end dev:** start the database (and API), then `pnpm --filter @psa/web dev` — Vite serves the SPA at :5173 and proxies `/api` to the API at :3000.

## Deployment

Production deployment is manual and is performed only by Watson on the Oracle server. Do not add or run automated deployment workflows unless the repository owner explicitly changes this rule.

## License

This is publicly visible proprietary software, not open-source software. See [LICENSE](LICENSE). No use, copying, modification, distribution, or deployment is permitted without prior written permission from the copyright holder.
