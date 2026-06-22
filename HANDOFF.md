# HANDOFF

Shared, living handoff document for the coding agents working on Partners Architector.

Any agent's session can stop at any time. This file is the single source of truth for what is in progress, so another agent can resume without losing context. The rules live in the "Collaboration and handoff" section of `AGENTS.md`. In short: write down what you are about to do here and commit it **before** you start, keep it updated as you go, and record the result here when you finish.

**Last updated:** 2026-06-22 — by: code-writing agent (Claude)

## Current status

PHASE 0 IN PROGRESS — Steps **0.1 (monorepo & tooling) and 0.2 (Docker Compose dev infra) are complete** and verified (tooling: `install`/`lint`/`format:check`/`typecheck`/`build`/`test` green; infra: `db` service live-tested — Postgres up, pgvector 0.8.3 enabled). Active item: **step 0.3 (API skeleton, NestJS) — in progress**. Spec adopted (`docs/spec/psa-mvp.md`; ADR `docs/decisions/0001-...`); plan at `docs/plans/phase-0-skeleton-and-infrastructure.md`.

### Owner decisions (2026-06-22)
- "First stage" = **Phase 0** (skeleton). Confirmed.
- **Do not rename the repository.** Build in `partners-architector`; product codename stays `psa` as in the spec.
- **Dev-server constraint:** the current development server is far from the target hardware — **do not attempt to run/deploy any LLM on it.** Phase 0 involves no LLM anyway (AI/ASR are Phases 7–8). The owner will provide a separate server when we reach the LLM phases.
- Notify the owner when Watson (deploy agent) is needed; not required during Phase 0.

## Active task

### Phase 0 — Skeleton & infrastructure (in progress)
- Owner: code-writing agent (Claude) — Plan committed: 2026-06-22; started: 2026-06-22
- Goal: Establish the monorepo, dev infra (Docker Compose + PostgreSQL/pgvector), Prisma schema + migrations, base auth/RBAC (3 roles), and seed data (30 questions, legal carriers) — a running skeleton later phases build on. Full detail: `docs/plans/phase-0-skeleton-and-infrastructure.md`.
- Plan (ordered, each step independently committable):
  - [x] 0.1 Monorepo & tooling baseline — DONE: pnpm workspaces (`apps/*`, `packages/*`), TS strict (`tsconfig.base.json`), ESLint 9 + Prettier, Vitest, root scripts, dir skeleton, commands documented in CLAUDE.md/README
  - [x] 0.2 Dev infra — DONE: `deploy/docker-compose.yml` (`db` = postgres16 + pgvector, healthcheck, named volume; api/web commented for 0.3/0.7), `deploy/.env.example`, `deploy/db/init` enables pgvector. Live-verified.
  - [~] 0.3 API skeleton (NestJS): config + env validation (zod), `/health` + `/health/db`, Prisma module (minimal schema), global pipe/filter; + `apps/api/Dockerfile` & compose `api` wiring — IN PROGRESS
  - [ ] 0.4 Prisma schema + initial migration (core §5 entities; enable pgvector; defer AI/ASR tables)
  - [ ] 0.5 Seed: 30 questions (App. A order + App. F texts), carriers (App. B) + default mappings; idempotent; tests
  - [ ] 0.6 Auth & RBAC: email/password (argon2), sessions/JWT, CSRF, rate limit, role guards, data isolation; tests
  - [ ] 0.7 Web skeleton (React + Vite + TS): shell, routing, component base, data layer, login page, ru i18n-ready
  - [ ] 0.8 Wire-up + Phase 0 DoD: e2e dev run via Docker Compose, smoke test, finalize docs/HANDOFF
- Notes / decisions: Stack per ADR 0001. Implementation-level choices: pnpm workspaces, Vitest. Build in THIS repo (product codename `psa`; repo `partners-architector`). Deployment stays manual (Watson); no CI/CD or secrets committed.
- How to resume: start at Step 0.3 (NestJS API skeleton) in the plan doc. To run the db: `cp deploy/.env.example deploy/.env`, set `POSTGRES_PASSWORD`, then `docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d db`. (In this ephemeral env, start the Docker daemon first: `dockerd &`.) If a step is mid-flight, its commit message plus the checkboxes above show where it stopped.

## Completed log

Most recent first.

- **2026-06-22 — Phase 0, step 0.2 (dev infrastructure).** Added `deploy/docker-compose.yml` with a `db` service (PostgreSQL 16 + pgvector, named volume, healthcheck), `deploy/.env.example` (POSTGRES_*/DATABASE_URL/secret placeholders; the required password has no default), and `deploy/db/init/01-enable-extensions.sql` (enables `vector` on a fresh volume). `api`/`web` are committed as commented templates, activated in 0.3/0.7 once their Dockerfiles exist. Live-verified: `docker compose up -d db` → Postgres ready, pgvector 0.8.3 enabled in the `psa` DB; `down -v` clean. — code-writing agent (Claude)
- **2026-06-22 — Phase 0, step 0.1 (monorepo & tooling baseline).** Stood up the pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`) with TypeScript (strict), ESLint 9 (flat config) + Prettier, and Vitest. Added root scripts (`build`/`lint`/`typecheck`/`test`/`format`), the Appendix-D directory skeleton (`prisma/`, `seed/`, `resources/`, `deploy/`, `tests/` with purpose READMEs), and the first shared primitive (`USER_ROLES` + guard) with tests. Updated CLAUDE.md/AGENTS.md/README to drop the "concept stage / no tooling" framing. All checks green. — code-writing agent (Claude)
- **2026-06-22 — Adopted the MVP spec and composed the Phase 0 plan.** Added `docs/spec/psa-mvp.md` (the authoritative ТЗ), ADR `docs/decisions/0001-adopt-psa-mvp-spec-and-stack.md`, and `docs/plans/phase-0-skeleton-and-infrastructure.md`. No application code yet. — code-writing agent (Claude)
- **2026-06-21 — Established the agent collaboration & handoff system.** Added the "Collaboration and handoff" and "Branching and commits" sections to `AGENTS.md`, created this `HANDOFF.md`, and added a pointer from `CLAUDE.md`. Switched the workflow to direct commits on `main` (no pull requests). — code-writing agent (Claude)

## Backlog / next up

Implementation follows the phased critical path in spec §11. Core = Phases 0–6; AI (7) and ASR (8) may be deferred under time pressure.

- **Phase 0** — Skeleton & infrastructure (active plan above).
- **Phase 1** — Cases, sessions, scenario engine, capture (§4.2–4.4). First minimally useful product.
- **Phase 2** — Gritz Calculator (§4.5, Appendix E).
- **Phase 3** — Authority matrix (§4.6).
- **Phase 4** — Assembly & legalization + export PDF/DOCX/CSV (§4.8, §10).
- **Phase 5** — Completeness checks + lifecycle/versions/diff (§4.7 FR-7.1, §4.9).
- **Phase 6** — Client portal (§4.11).
- **Phase 7** — AI assistant (text): inference, draft/rephrase/AI-checks, RAG, job queue (§4.10, §6).
- **Phase 8** — ASR (§4.10 FR-10.6).
