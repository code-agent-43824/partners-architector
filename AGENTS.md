# AGENTS.md

## Project

Partners Architector is a software product for designing, establishing, and developing business partnerships.

The product is currently in the concept stage. Do not infer product requirements, choose a technology stack, or add application code until those decisions are explicitly recorded in this repository.

## Required workflow

1. Read this file, `README.md`, and `HANDOFF.md` before making changes.
2. Inspect the current repository state and preserve unrelated work.
3. Keep each change narrow, documented, and independently reviewable.
4. Do not add dependencies, frameworks, generated scaffolding, external services, or infrastructure without explicit approval.
5. Add or update tests when application code is introduced.
6. Never commit credentials, tokens, private keys, personal data, production configuration, or generated secrets.

## Collaboration and handoff

Multiple coding agents share this repository and work asynchronously:

- One agent writes the primary application code.
- Watson, the deployment agent, extends the code, fixes bugs, and performs deployment.

Any agent's session can be interrupted at any moment, so every task must stay resumable by another agent. `HANDOFF.md` is the single source of truth for in-flight work; treat anything not recorded there as not started.

1. Before starting a task, write the plan in `HANDOFF.md` and commit it *before* you touch any code.
2. Keep `HANDOFF.md` current as you make progress.
3. When you finish, or have to stop, record the outcome and the exact next step in `HANDOFF.md`, then commit.

## Branching and commits

- Commit directly to `main`. Do not open pull requests or create feature branches unless the owner asks.
- Keep commits small and self-describing so an interrupted task is easy to pick up.

## Source and documentation

- Use UTF-8 and LF line endings.
- Prefer clear, boring, maintainable solutions over speculative abstractions.
- Record durable architectural decisions in `docs/decisions/` when that directory is introduced.
- Keep public documentation free of secrets and private operational details.

## Deployment

- Production deployment is manual and may be performed only by Watson, the deployment agent.
- The production target is the Oracle server.
- Do not create CI/CD deployment workflows, deploy keys, server credentials, or automatic release jobs.
- Only Watson may access or modify the production server; other agents must not.
- A repository change is not permission to deploy it.

## Licensing

This repository is proprietary despite being public. The `LICENSE` file prohibits use, copying, modification, distribution, and deployment without prior written permission.
