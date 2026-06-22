# Partners Architector

Software product for designing, establishing, and developing business partnerships.

## Status

Active development. The MVP requirements are specified in [docs/spec/psa-mvp.md](docs/spec/psa-mvp.md); see [HANDOFF.md](HANDOFF.md) for live status. The codebase is a pnpm monorepo currently in Phase 0 (skeleton & infrastructure).

Current public placeholder: <https://partners-architector.duckdns.org/>

## Development

Before making changes, read [AGENTS.md](AGENTS.md) — it defines the working rules for human and coding-agent contributors — and [HANDOFF.md](HANDOFF.md) for in-flight work. Common commands (Node 22, pnpm 10) live in [CLAUDE.md](CLAUDE.md): `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Deployment

Production deployment is manual and is performed only by Watson on the Oracle server. Do not add or run automated deployment workflows unless the repository owner explicitly changes this rule.

## License

This is publicly visible proprietary software, not open-source software. See [LICENSE](LICENSE). No use, copying, modification, distribution, or deployment is permitted without prior written permission from the copyright holder.
