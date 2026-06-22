# 0001 — Adopt the PSA MVP specification and its technology stack

- **Status:** Accepted
- **Date:** 2026-06-22
- **Decider:** Repository owner (Kirill Mescheryakov)

## Context

Until now the repository was deliberately at the concept stage: no application code, no chosen stack, no dependencies (see `CLAUDE.md` and `AGENTS.md`). The owner has now supplied the authoritative MVP specification for the product **«Помощник партнёрских сессий»** (Partner Session Assistant, codename `psa`), stored at `docs/spec/psa-mvp.md` (version 1.2, MVP). The specification is self-contained: it records product scope, user roles, functional/non-functional requirements, the data model, AI architecture, the technology stack, a phased implementation path, and acceptance criteria.

## Decision

1. `docs/spec/psa-mvp.md` is adopted as the single source of truth for product requirements. Where this repository's docs and the spec disagree on product scope, the spec wins; where they disagree on collaboration/governance, `AGENTS.md` wins.
2. The technology stack defined in the spec (§7) is adopted for the MVP:
   - **Monorepo** — `apps/web` (React 18 + TypeScript + Vite SPA), `apps/api` (Node.js + TypeScript, **NestJS**), `packages/shared`.
   - **Data** — PostgreSQL 16 + **pgvector**, **Prisma** ORM with migrations.
   - **Background jobs** — **pg-boss** (on PostgreSQL; no separate broker).
   - **Documents** — Playwright (PDF), `docx` (DOCX), CSV.
   - **AI (later phases)** — self-hosted inference only (Ollama/vLLM, OpenAI-compatible endpoint), `bge-m3` embeddings, `faster-whisper` ASR. **No third-party cloud LLMs/aggregators.**
   - **Deployment** — Docker Compose on the customer's infrastructure.
   - **Auth (MVP)** — email + password (argon2/bcrypt), server sessions or JWT (httpOnly cookie), CSRF, rate limiting; MFA/FIDO2 deferred to post-MVP (auth kept extensible).
3. Implementation follows the phased critical path in spec §11 (Phases 0–8). Core = Phases 0–6; AI (7) and ASR (8) may be deferred under time pressure without losing core value.

## Consequences

- The "no application code / no stack" hold in `CLAUDE.md` and `AGENTS.md` is **lifted for this product, within the bounds of the adopted spec.** Adding code, the dependencies above, and the monorepo scaffolding is now in scope.
- Constraints that **remain in force**:
  - Proprietary license; secrets are never committed (`.env.example` only).
  - **Self-hosted-only AI** — no third-party clouds/aggregators; the single AI endpoint is the customer's inference server. Enforced in code and review (spec SEC-4).
  - **Deployment is manual and performed only by Watson.** No CI/CD release automation, deploy keys, or server credentials in the repository. A repository change is never permission to deploy. Note: the product's own `deploy/docker-compose.yml` is application/runtime configuration, not a deploy pipeline, and is in scope.
- Items the spec leaves open (final inference model and server, methodology texts pending Dmitry Gritz's approval, MOST Partners branding assets) are handled as seed-data/config and do **not** block Phase 0.

## Implementation-level choices (this repo)

These are not mandated by the spec; recorded here so agents stay consistent. They can be revisited without a new ADR while Phase 0 is in flight:

- Package manager / workspaces: **pnpm workspaces**.
- Test runner: **Vitest** across the monorepo (Jest is acceptable on the NestJS side if it reduces friction).
- The product is built **in this repository** (`partners-architector`). The spec's codename `psa` / `partner-session-assistant` is the product codename, not a repository rename.
