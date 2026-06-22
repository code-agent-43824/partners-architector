# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Partners Architector (product codename `psa`, "Partner Session Assistant") is a software product for designing, establishing, and developing business partnerships. Its MVP requirements are defined in `docs/spec/psa-mvp.md` — the authoritative specification, adopted in `docs/decisions/0001-adopt-psa-mvp-spec-and-stack.md`.

Implementation has started. The repository is a **pnpm monorepo** (`apps/web`, `apps/api`, `packages/shared`) and is currently in **Phase 0 (skeleton & infrastructure)** — see `docs/plans/phase-0-skeleton-and-infrastructure.md` and `HANDOFF.md` for live status.

### Commands

Run from the repository root (Node 22, pnpm 10):

- `pnpm install` — install workspace dependencies.
- `pnpm lint` / `pnpm lint:fix` — ESLint across the monorepo.
- `pnpm format` / `pnpm format:check` — Prettier (Markdown is intentionally not formatted).
- `pnpm typecheck` — TypeScript checks per workspace.
- `pnpm build` — build all workspaces that define a build.
- `pnpm test` / `pnpm test:watch` — Vitest.

The Docker Compose dev stack (PostgreSQL/pgvector, api, web) is added in step 0.2; this list grows with each step.

## Collaboration and handoffs

This repository is worked on by more than one coding agent, asynchronously:

- **You (Claude)** write the primary application code.
- **Watson**, the deployment agent, extends the code, fixes bugs, and deploys.

Because any session can be interrupted, follow the document-first protocol on every task:

1. Write the plan in `HANDOFF.md` and commit it **before** changing code.
2. Keep `HANDOFF.md` updated as you go.
3. Record the outcome and the exact next step in `HANDOFF.md` when you finish or stop.

Read `HANDOFF.md` at the start of every session — it is the source of truth for in-flight work. Commit directly to `main`; do not open pull requests or create feature branches unless the owner asks. Full rules are in `AGENTS.md`.

## Hard constraints

These are the rules that make this repo unusual. Read `AGENTS.md` in full before any change — the points below are the load-bearing ones:

- **Stay within the adopted spec and stack.** The technology stack is now chosen and recorded in `docs/decisions/0001-adopt-psa-mvp-spec-and-stack.md`; product scope is defined by `docs/spec/psa-mvp.md`. Add code, dependencies, and infrastructure **only** as the spec and the current phase require. Introducing a different stack, speculative frameworks, or external/third-party services requires a new decision recorded in `docs/decisions/` first.
  - **Self-hosted AI only.** AI/ASR (Phases 7–8) use the customer's self-hosted, OpenAI-compatible inference endpoint — **no third-party cloud LLMs or aggregators** (spec SEC-4). Do **not** run or deploy an LLM on the development server; a dedicated server is provided when the AI phases begin.
- **Proprietary despite being public.** `LICENSE` prohibits use, copying, modification, distribution, and deployment without prior written permission from the copyright holder. Public visibility is for review/collaboration only.
- **Deployment is out of bounds for coding agents.** Production deploys are manual, performed only by Watson, targeting the Oracle server. Do not create CI/CD workflows, deploy keys, server credentials, or release jobs, and do not access or modify the production server. A repository change is never permission to deploy it. (The product's own `deploy/docker-compose.yml` is application/runtime configuration and is in scope; a release pipeline is not.)
- **Never commit** credentials, tokens, private keys, personal data, or production configuration.

## Working style

- Keep each change narrow, documented, and independently reviewable.
- Prefer clear, boring, maintainable solutions over speculative abstractions.
- When application code is eventually introduced, add or update tests alongside it.
- Record durable architectural decisions in `docs/decisions/` as ADRs (`0001-…` is the first).

## Formatting

Enforced by `.editorconfig`: UTF-8, LF line endings, final newline, 2-space indentation, trim trailing whitespace. Exception: Markdown files keep trailing whitespace.
