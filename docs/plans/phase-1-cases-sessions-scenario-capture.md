# Phase 1 — Cases, sessions, scenario engine, capture (technical plan)

- **Spec:** `docs/spec/psa-mvp.md` §4.2 (partnerships & sessions), §4.3
  (session scenario), §4.4 (capturing agreements), §5 (data model), §11 (Phase 1).
- **Builds on:** Phase 0 (auth/RBAC, `ownership` isolation, Prisma schema,
  the 30-block seed, the `@psa/api` module + `@psa/web` SPA patterns).
- **Status:** Planned, not started. Awaiting owner go-ahead.

## 1. Objective

Deliver the **first minimally useful product**: an architect creates a
partnership, adds 2–4 partners, starts a session — which instantiates the 30
methodology blocks — walks the scenario, writes and refines each agreement,
captures partner sign-offs, and keeps a version history. This is the core
"don't let them forget / don't let them skip / collect and remove the routine"
loop, without the calculator (Phase 2), matrix (Phase 3), export (Phase 4),
checks/lifecycle (Phase 5), client portal (Phase 6), or AI (Phases 7–8).

## 2. Scope

**In scope (spec §4.2–4.4):** partnerships CRUD + archive; partners (2–4);
sessions (initial/review, status lifecycle); scenario engine (instantiate 30
blocks as clauses, navigation, statuses, "неактуально", progress); capture
(formulation text + autosave, rationale, source, partner sign-offs,
`clause_version` history + rollback).

**Out of scope (later phases):** Gritz calculator, authority matrix, complete
consistency checks (Phase 1 does only the basic completion warnings), export,
review/diff lifecycle, client portal/questionnaire, AI/ASR.

## 3. Adopted & implementation-level decisions

Reuse Phase 0: NestJS feature modules with zod DTOs (`ZodBody`), the global
`JwtAuthGuard`/`RolesGuard`, and `assertCanAccessOwned` on every
partnership-scoped endpoint (SEC-5; an architect touches only their own data).
Web: React + Vite + React Router + TanStack Query; the `/api` client with CSRF.
Formulation text starts as a plain textarea; the TipTap/ProseMirror editor
(spec §7.2) is introduced when the clause editor is built (step 1.5). New work
is `architect`-role by default; admin is unrestricted.

## 4. Workstreams (ordered, each independently committable)

Each step ends green (build + lint + typecheck + tests) with a commit; update
the `HANDOFF.md` checklist as steps land. Document-first: write/keep the plan
before code.

### 1.1 — Partnerships (cases) CRUD
- API `partnerships` module: create (name, `type_tags`, notes), list (search
  by name, filter active/archived), get, update, archive (soft), delete
  (guarded, explicit). Owner-scoped via `ownership` (FR-2.1, 2.2, 2.6).
- Web: partnerships list (search/filter) + create form + detail shell.
- Tests: ownership isolation (architect cannot see/touch another's), validation.
- **Done when:** an architect can create/list/open/archive their partnerships;
  cross-architect access is denied.

### 1.2 — Partners
- API: 2–4 partners per partnership (full_name, role, contact, order_index);
  add/remove/reorder; enforce the 2–4 bound (FR-2.3).
- Web: partner editor in the partnership detail.
- **Done when:** partners can be managed and reordered within the 2–4 limit.

### 1.3 — Sessions
- API `sessions` module: create (kind initial|review; review requires a
  baseline session), list per partnership, status draft→in_progress→completed
  with completion guard warnings (heavy blocks unresolved / unconfirmed agreed
  blocks; full checks panel is Phase 5) (FR-2.4, 2.5).
- Web: sessions list + create + session header (status, progress).
- **Done when:** sessions can be created and transitioned; completing warns on
  open heavy blocks.

### 1.4 — Scenario engine
- On initial-session create, instantiate the current question set (30 blocks)
  as `clause` rows in methodology order (FR-3.1).
- API: list a session's clauses (ordered), set block status
  (`not_started|in_progress|parked|agreed|disputed|not_applicable`), with
  `agreed` allowed only when text exists; `not_applicable` requires a reason
  (FR-3.4, 3.6). Progress counters (FR-3.5).
- Web: table-of-contents with status indicators; block view (number, title,
  prompt, helper questions, category + heavy badges); status control; the
  "неактуально" confirm dialog with mandatory reason; global progress.
- Tests: instantiation count/order; status transition rules.
- **Done when:** a new session shows all 30 blocks in order with working
  statuses, the "неактуально" guard, and progress.

### 1.5 — Capturing agreements (live protocol)
- API: clause `text` (+ `rationale`, `source`), partner sign-offs
  (`clause_signoff`: per-partner agreed + timestamp; block fully confirmed when
  all partners agree), and `clause_version` history with rollback (FR-4.1–4.5).
- Web: clause editor (formatted text via TipTap), autosave (debounce ≤ 2 s),
  per-partner sign-off toggles, version history view + restore.
- Tests: autosave/version creation, "all partners agreed" logic, rollback.
- **Done when:** an architect can write/edit an agreement, partners sign off,
  and previous versions can be viewed and restored.

## 5. Phase 1 Definition of Done

- An architect, end-to-end: create partnership → add partners → start session →
  see 30 ordered blocks → write agreements (autosaved) → set statuses → record
  partner sign-offs → view/rollback versions. Data isolation holds throughout.
- `pnpm build`/`lint`/`typecheck`/`test` green; unit tests for the status/
  sign-off/version logic, integration tests for the API (NFR-8).
- Maps to spec acceptance: AC-2 (30-block instantiation/order), AC-3 (statuses
  + "неактуально"), AC-4 (capture + sign-offs + versions), foundations of AC-1
  (isolation) carried from Phase 0.

## 6. Risks & open questions

- **Methodology texts are drafts** (App. F) — already isolated as seed/config
  (`QUESTION_SET_VERSION`); no blocker.
- **Editor choice:** plain textarea first, TipTap in 1.5 — confirm acceptable.
- **Completion guards** overlap with Phase 5 checks; Phase 1 implements only the
  basic warnings and leaves the full "Проверка" panel to Phase 5.
- **Review sessions** (kind=review) copy baseline clauses/shares/matrix — shares
  and matrix don't exist until Phases 2–3, so review-copy in Phase 1 covers
  clauses only; revisit when those land (FR-9.3).

## 7. What Phase 1 deliberately does NOT do

No calculator, matrix, export, full checks, lifecycle diff, client portal, or
AI. Those are Phases 2–8.
