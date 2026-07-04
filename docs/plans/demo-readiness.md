# Demo readiness — прототип для показа Дмитрию Грицу

- **Owner decision (2026-07-02):** re-order development around a demo to Dmitry
  Gritz and the architects. Goal of the demo: honest directional feedback
  («туда ли мы идём») while already delivering real value — the product must
  not read as a bare prototype. The owner's hypothesis, accepted here: the
  maximum near-term value is **removing routine and assembling the partnership
  agreement**, not the share calculator (a shares split can be done on paper;
  an assembled, editable agreement document cannot).
- **Spec:** `docs/spec/psa-mvp.md` §4.3–4.4 (navigation debt), §4.5 FR-5.1
  (manual shares mode only), §4.8 + §10 (assembly & export), §13 (draft
  content caveat). This plan **re-sequences** spec §11: parts of Phase 4
  (assembly/export of the agreement) are pulled forward; Phase 2 (calculator)
  and Phase 3 (matrix) move to after the demo feedback.
- **Status:** in progress. **D1 done and live** (2026-07-03, in release
  `e12a084`). **D2 + D3 done** (code-complete + browser-verified, 2026-07-04;
  D2 `22b0aa4` = manual shares + смысл долей + a live D1 edit-crash fix, D3
  `f04061c` = agreement assembly + printable view). Both await a combined
  `psa-api`+`psa-web` deploy — see HANDOFF. D4–D5 planned; **D4 is next**
  (server PDF/DOCX export — gated on Watson's W5 sanitization).

## 1. Rationale (why this order)

The spec's phase order (calculator → matrix → export) optimizes for document
completeness. For learning speed it is backwards: the demo must prove the core
promise — «не дать забыть / не дать пропустить / собрать и снять рутину» — and
the visible proof of «снять рутину» is pressing a button and receiving a
professionally formatted partnership agreement (PDF + editable DOCX). The
calculator is methodologically important (and carries Gritz's name — it must
be *mentioned* in the demo as the next milestone), but its absence does not
weaken the core story; the shares block is covered by the spec's own manual
input mode (FR-5.1), which is anyway the default for existing partnerships
(FR-5.2). The authority matrix (blocks 14–16) is likewise deferred: in the
demo those blocks are captured as text, and the interactive matrix is named as
next. (Owner may override and pull the matrix before the demo — noted as an
open decision.)

Second pillar: **the demo must not look like a prototype.** Today's UI is the
weakest link (one endless scroll of 30 cards, `window.confirm/prompt` dialogs,
bare styling, English error strings). Session-day UX is therefore step D1, not
an afterthought — it also happens to be the FR-3.2 navigation debt.

## 2. Steps (ordered; each independently committable + deployable)

### D1 — Session-day UX (the "not a prototype" pass)
- Scenario navigation per FR-3.2: table of contents (30 blocks, status
  indicators, category groups) + single-block focus mode + prev/next +
  keyboard shortcuts; progress header (agreed N/M, heavy open, disputed/parked).
- Proper modal dialogs (component, not `window.confirm/prompt`) for
  «неактуально» (warning + mandatory reason), deletes, session actions.
- Russian, specific error messages (map API errors; e.g. limits, validation);
  global "connection lost / saving failed" indicator so autosave failures are
  never silent.
- Visual polish pass: typography, spacing, header/nav, empty states. Not a
  full design system — a disciplined cleanup of the existing CSS.
- Autosave efficiency: update the query cache from the PATCH response
  (`setQueryData`) instead of refetching all 30 clauses on every save.
- **Done when:** an architect can run a session from the TOC keyboard-first,
  all dialogs are proper components, and a stranger would not call the
  scenario screen a prototype.

### D2 — Shares block: manual input (FR-5.1 manual mode, FR-5.8)
- In blocks №5/№6: structured manual entry — final share per partner
  (sum = 100% validated live) and «смысл долей» flags (голосование / прибыль /
  владение / убытки) — stored in `clause.structured_data` (exists since 0.4).
- The «Рассчитать доли (Калькулятор Грица)» mode is *not* built yet; the UI
  shows the mode switch with the calculator marked «скоро» so its place in
  the method is visible during the demo.
- **Done when:** shares are captured structurally and render as a table (used
  by D3), while the block still supports free-text formulation.

### D3 — Agreement assembly + print view (first tangible deliverable)
- Server-assembled agreement (per DOC-1, minus matrix): title page (name,
  participants, date, version, sign-off status) → «Принципы» (Appendix G
  seed) → 30 sections in method order (title + formulation + rationale;
  not-applicable blocks listed with reason) → shares table from D2.
- Rendered as a document-styled page with print CSS — «Печать / сохранить в
  PDF» via the browser. Cyrillic-safe fonts.
- **Done when:** one click on a completed session produces a printable
  agreement a client could be handed.

### D4 — Server export: PDF + DOCX (§10)
- Server-side generation per spec §7.3: PDF via headless Chromium
  (Playwright) rendering the D3 HTML template; DOCX via the `docx` library
  (architects post-edit the document — DOCX is the real deliverable).
  CSV not needed yet (it belongs to the legalization checklist, later).
- `export_record` logging (DOC-5); neutral professional template (DOC-3);
  embedded Cyrillic fonts (DOC-4); SEC-9 warning that exported files leave
  the app's storage.
- **Deploy note:** adds server dependencies (`playwright` + Chromium in the
  api image — image size grows materially; `docx`). Requires W5 (server-side
  HTML sanitization) to land first, since clause HTML is rendered into
  documents.
- **Done when:** the same agreement downloads as PDF and DOCX with correct
  Cyrillic and formatting from the TipTap editor.

### D5 — Demo kit
- `db:seed:demo` — a realistic, owner-reviewed demo partnership (3 partners,
  ~25 blocks agreed with plausible formulations, a couple of «спор» /
  «отложен» / «неактуально» blocks, shares filled) so the demo starts from a
  living product, not empty screens. Idempotent, dev/demo only — never run on
  real data.
- A 10–12 minute demo script: open the filled case → TOC → walk one block
  live (type, статус, подтверждения) → «неактуально» guard → version history
  → shares table → assemble → export PDF/DOCX. Mention calculator + matrix as
  next milestones.
- Dry run + screenshots to the owner before the real demo.
- **Done when:** the owner has run the script end-to-end on the live server.

## 3. Owner tasks (not agent work)

- **O1.** Proof-read the 30 block texts (`mvp-draft-1`, Appendix F drafts) —
  without involving Gritz — against his public materials; corrections go into
  the seed with a `QUESTION_SET_VERSION` bump. Showing Gritz noticeably wrong
  methodology texts is the main «это не то» risk.
- **O2.** Decide demo timing/format and the audience (Gritz alone vs +
  architects).
- **O3.** Open decision: matrix before the demo (default: after; captured as
  text in the demo).
- **O4.** Review D1 screenshots (visual sign-off) before D3 styling reuses them.
- **O5.** Decide demo point: after D4 (recommended — DOCX is the hook) or
  after D3 if timing presses.

## 4. After the demo

Feedback drives the re-prioritization of the remaining spec phases; default
order: Gritz Calculator (Phase 2) → Authority matrix (Phase 3) → legalization
checklist (rest of Phase 4) → checks/lifecycle (Phase 5) → client portal
(Phase 6) → AI/ASR (7–8). The Watson ops/security backlog (HANDOFF) proceeds
in parallel throughout.
