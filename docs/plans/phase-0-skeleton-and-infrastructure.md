# Phase 0 — Skeleton & infrastructure (technical plan)

- **Spec:** `docs/spec/psa-mvp.md` §11 (Phase 0), §5 (data model), §7 (stack), §9 (security MVP), Appendices A, B, D, F.
- **Decision record:** `docs/decisions/0001-adopt-psa-mvp-spec-and-stack.md`.
- **Status:** Planned, not started. Awaiting owner go-ahead to implement.

## 1. Objective

Stand up a running, testable skeleton that every later phase builds on: the monorepo and tooling, dev infrastructure (Docker Compose + PostgreSQL/pgvector), the Prisma schema and first migration, base authentication and RBAC for the three roles, and the methodology seed data (30 question blocks and the legal-carrier reference). No product features yet — this phase makes the foundation solid and reproducible.

## 2. Scope

**In scope (spec §11, Phase 0):**
- Monorepo (`apps/web`, `apps/api`, `packages/shared`) and shared tooling.
- Docker Compose dev stack: PostgreSQL 16 + pgvector, `api`, `web`.
- Prisma schema for the core domain entities + initial migration; pgvector extension enabled.
- Base auth (email/password) and RBAC with three roles (admin / architect / client), plus the data-isolation pattern.
- Seed: 30 questions (Appendix A order + Appendix F texts), legal carriers enum and default mappings (Appendix B).
- Project commands (build/lint/test/run) documented in `CLAUDE.md` / `AGENTS.md`.

**Out of scope (later phases):**
- Any session/scenario/capture UI and logic (Phase 1), calculator (Phase 2), matrix (Phase 3), assembly/export (Phase 4), checks/lifecycle (Phase 5), client portal features (Phase 6).
- All AI/RAG and ASR (Phases 7–8): no inference/asr containers, no `kb_*` / `ai_job` / `audio_*` behavior yet (the pgvector extension is installed, but vector tables are deferred to Phase 7).
- CI pipelines, production secrets, deploy automation (deployment stays manual — Watson).

## 3. Adopted & implementation-level decisions

Stack per ADR 0001 (NestJS, Prisma, pg-boss, React+Vite, PostgreSQL+pgvector). Implementation-level choices for Phase 0: **pnpm workspaces**, **Vitest**, TypeScript strict mode, ESLint + Prettier, `.editorconfig` already present (2-space, LF, UTF-8).

## 4. Target repository layout (Phase 0 subset of Appendix D)

```
/ (partners-architector)
├─ apps/
│  ├─ web/            # React 18 + TS + Vite (SPA shell + login)
│  └─ api/            # NestJS + TS
│     └─ src/
│        ├─ modules/  # auth (Phase 0); others land in later phases
│        └─ core/     # pure domain logic (tested) — seed/order helpers in Phase 0
├─ packages/
│  └─ shared/         # DTOs, enums (carrier, roles, statuses, matrix levels)
├─ prisma/            # schema.prisma, migrations
├─ seed/              # questions (A+F), carriers (B), default legal mappings
├─ resources/         # cyrillic fonts, templates (placeholders in Phase 0)
├─ deploy/            # docker-compose.yml, .env.example, proxy config (later)
├─ tests/             # integration tests
└─ docs/              # spec, decisions, plans (already present)
```

## 5. Workstreams (ordered, each independently committable)

Each step ends with a green build + its tests + a commit, so an interrupted session is easy to resume. Update the checklist in `HANDOFF.md` as steps complete.

### 0.1 — Monorepo & tooling baseline
- pnpm workspace (`pnpm-workspace.yaml`), root `package.json` with scripts (`build`, `lint`, `test`, `dev`), root `tsconfig.base.json`, ESLint + Prettier configs.
- Create the directory skeleton above with placeholder `package.json` in each workspace.
- Document the resulting commands in `CLAUDE.md` and `AGENTS.md` (replace "no build tooling" wording).
- **Done when:** `pnpm install`, `pnpm lint`, `pnpm test` run cleanly on an empty skeleton.

### 0.2 — Dev infrastructure (Docker Compose + Postgres/pgvector)
- `deploy/docker-compose.yml` with `db` (`pgvector/pgvector:pg16` or Postgres 16 + pgvector), `api`, `web`. Named volume for DB data; healthchecks; depends_on.
- `deploy/.env.example` (DB URL, app secrets placeholders, ports). Real `.env` is git-ignored (already covered by `.gitignore`).
- **Done when:** `docker compose -f deploy/docker-compose.yml up db` starts Postgres with the pgvector extension available.

### 0.3 — API skeleton (NestJS)
- NestJS bootstrap, `ConfigModule` (env validation), global pipes/filters, structured logging.
- `GET /health` (liveness) and `GET /health/db` (checks DB connectivity).
- `PrismaModule` / Prisma client provider.
- **Done when:** `api` boots, `/health` returns 200, `/health/db` reflects DB status; a smoke test passes.

### 0.4 — Prisma schema + initial migration
- Model the core relational entities from spec §5 needed through Phase 6: `account`, `partnership`, `partner`, `session`, `question`, `clause`, `clause_signoff`, `clause_version`, `share_calculation`, `matrix_decision`, `matrix_cell`, `legal_mapping`, `consistency_finding`, `questionnaire_invite`, `questionnaire_answer`, `client_access`, `client_artifact`, `export_record`, `settings`. Use the exact enums from the spec (roles, clause status, carrier, finding type/severity/status, etc.).
- Enable the `vector` extension in the migration (table use deferred to Phase 7). Defer `kb_document`/`kb_chunk`/`ai_job`/`audio_recording`/`transcript_segment` to their phases.
- Generate the initial Prisma migration.
- **Done when:** migration applies cleanly to a fresh DB; `prisma migrate status` is clean; a test applies migrations and connects.

### 0.5 — Seed data
- `question` rows: 30 blocks in the fixed order with `number`, `title`, `category` (контур), `is_sensitive` (Appendix A), `prompt` + `helper_questions` (Appendix F), `question_set_version`.
- `carrier` reference + default `legal_mapping` presets (Appendix B). Optionally seed the 4 principles (App. G), matrix rows (App. H), questionnaire (App. J), and calculator thresholds (App. I) — these may also land with their phases; at minimum A + B in Phase 0.
- Idempotent, re-runnable seed script wired to a `pnpm seed` command.
- **Tests:** all 30 questions load in the correct order; categories and "heavy" flags match Appendix A; carrier enum complete.
- **Done when:** seeding a fresh DB yields exactly the Appendix A set, ordered, with correct flags.

### 0.6 — Auth & RBAC
- Email/password registration & login; password hashing with **argon2**; server session (httpOnly, secure cookie) or JWT; **CSRF** protection; **rate limiting** on auth routes.
- Role guard for `admin` / `architect` / `client`; route + API protection by role.
- Data-isolation utility/guard: an architect can access only their own partnerships (foundation enforced now; used everywhere later). Client access scoped via `client_access`.
- Initial admin bootstrapped from env (not committed).
- **Tests:** login happy path; wrong-password/locked; RBAC denial for cross-role access; architect cannot read another architect's partnership.
- **Done when:** auth + role guards + isolation pass their tests (supports spec AC-1, AC-12 RBAC).

### 0.7 — Web skeleton (React + Vite + TS)
- App shell, routing, a Radix/shadcn-style component base, data layer (TanStack Query or RTK Query), API client with auth/session handling, login page, ru-default i18n scaffold (i18n-ready per NFR-4).
- **Done when:** `web` builds; login page authenticates against `api`; an authenticated empty "Partnerships" placeholder route renders.

### 0.8 — Wire-up & Phase 0 acceptance
- Full dev run via Docker Compose (`db` + `api` + `web`); end-to-end smoke: register/login architect → reach the empty partnerships screen.
- Finalize docs: dev "Getting started" (in `CLAUDE.md`/`README` as appropriate), confirm commands, update `HANDOFF.md` (mark Phase 0 done, set Phase 1 as next).
- **Done when:** the Phase 0 DoD below is fully met.

## 6. Phase 0 Definition of Done

- `docker compose up` brings up `db` + `api` + `web`; `/health` and `/health/db` are green.
- Migrations apply to a fresh DB; pgvector extension present.
- Seed produces the 30 Appendix A questions (ordered, correct categories + heavy flags) and the carrier reference.
- An architect can register and log in; RBAC guards enforce the three roles; an architect sees only their own data.
- `pnpm build`, `pnpm lint`, `pnpm test` are green and documented in `CLAUDE.md`/`AGENTS.md`.
- No secrets committed; no third-party network calls; deployment remains manual.

**Maps to spec acceptance criteria:** foundations of AC-1 (auth/roles/isolation), AC-2 (the 30-block seed and order — instantiation into a session comes in Phase 1), AC-12 (TLS at proxy is Phase-later; RBAC/isolation start here), AC-13 (Docker Compose runs without external runtime deps).

## 7. Risks & open questions

- **Methodology content is draft.** Question texts (App. F), principles (G), matrix rows (H), calculator thresholds (I), questionnaire (J) are drafts pending Dmitry Gritz. They are stored as seed/config so updating them needs no code change. *No blocker for Phase 0.*
- **Repository name vs codename.** RESOLVED (owner, 2026-06-22): build in this repo (`partners-architector`) without renaming; product codename stays `psa` as in the spec.
- **Inference/ASR hardware** (8 GB dev profile, final server) is out of Phase 0; only config keys (`inference_base_url`, `llm_model`, …) are reserved in `settings`. **Dev-server constraint (owner, 2026-06-22):** the current development server is far from target — do **not** run or deploy any LLM on it. A separate server will be provided when Phases 7–8 begin. Phase 0 starts no inference/ASR containers, so this is not a Phase-0 blocker.
- **Docker Compose vs deployment rules.** `deploy/docker-compose.yml` is product/runtime config, not a deploy pipeline; production deploys stay manual (Watson). Flagged in ADR 0001.

## 8. What Phase 0 deliberately does NOT do

No session features, no calculator, no matrix, no export, no checks, no lifecycle, no client-portal features, no AI/ASR. Those are Phases 1–8. Phase 0 is foundation only.
