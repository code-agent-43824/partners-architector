# AGENTS.md

## Project

Partners Architector is a software product for designing, establishing, and developing business partnerships.

The product is currently in the concept stage. Do not infer product requirements, choose a technology stack, or add application code until those decisions are explicitly recorded in this repository.

## Required workflow

1. Read this file and `README.md` before making changes.
2. Inspect the current repository state and preserve unrelated work.
3. Keep each change narrow, documented, and independently reviewable.
4. Do not add dependencies, frameworks, generated scaffolding, external services, or infrastructure without explicit approval.
5. Add or update tests when application code is introduced.
6. Never commit credentials, tokens, private keys, personal data, production configuration, or generated secrets.

## Source and documentation

- Use UTF-8 and LF line endings.
- Prefer clear, boring, maintainable solutions over speculative abstractions.
- Record durable architectural decisions in `docs/decisions/` when that directory is introduced.
- Keep public documentation free of secrets and private operational details.

## Deployment

- Production deployment is manual and may be performed only by Watson.
- The production target is the Oracle server.
- Do not create CI/CD deployment workflows, deploy keys, server credentials, or automatic release jobs.
- Coding agents must not access or modify the production server.
- A repository change is not permission to deploy it.

## Licensing

This repository is proprietary despite being public. The `LICENSE` file prohibits use, copying, modification, distribution, and deployment without prior written permission.
