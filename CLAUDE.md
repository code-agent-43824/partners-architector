# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Partners Architector is a software product for designing, establishing, and developing business partnerships. It is **at the concept stage and intentionally contains no application code yet** — only governance and documentation files (`README.md`, `AGENTS.md`, `LICENSE`, `.editorconfig`, `.gitignore`).

There is no build, test, lint, or run tooling because there is nothing to build yet. Do not invent or scaffold any.

## Hard constraints

These are the rules that make this repo unusual. Read `AGENTS.md` in full before any change — the points below are the load-bearing ones:

- **Do not add application code, a technology stack, dependencies, frameworks, generated scaffolding, external services, or infrastructure** until those decisions are explicitly recorded in the repository. Absence of a chosen stack is deliberate, not an oversight to fix.
  - Note: `.gitignore` already lists `node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`. This anticipates a possible JS/Node direction but is **not** approval to adopt it. The stack is still unchosen.
- **Proprietary despite being public.** `LICENSE` prohibits use, copying, modification, distribution, and deployment without prior written permission from the copyright holder. Public visibility is for review/collaboration only.
- **Deployment is out of bounds for coding agents.** Production deploys are manual, performed only by Watson, targeting the Oracle server. Do not create CI/CD workflows, deploy keys, server credentials, or release jobs, and do not access or modify the production server. A repository change is never permission to deploy it.
- **Never commit** credentials, tokens, private keys, personal data, or production configuration.

## Working style

- Keep each change narrow, documented, and independently reviewable.
- Prefer clear, boring, maintainable solutions over speculative abstractions.
- When application code is eventually introduced, add or update tests alongside it.
- Record durable architectural decisions in `docs/decisions/` (create the directory when the first decision is made).

## Formatting

Enforced by `.editorconfig`: UTF-8, LF line endings, final newline, 2-space indentation, trim trailing whitespace. Exception: Markdown files keep trailing whitespace.
