# 0002 — Support both Docker Compose and Podman as deployment targets

- **Status:** Accepted
- **Date:** 2026-06-23
- **Decider:** Repository owner (Kirill Mescheryakov)

## Context

ADR 0001 adopted Docker Compose as the deployment mechanism (spec §7.6). The
first production test deploy went to the Oracle host, which did **not** have
Docker/Compose installed; Watson deployed the same runtime shape with
**Podman** (rootful containers + systemd, behind Caddy/HTTPS) instead.

The eventual production host is not fixed: it may run Docker or Podman. The
owner does not want to bet on one engine.

## Decision

Maintain **two first-class, supported deployment targets**, kept in sync:

1. **Docker Compose** — `deploy/docker-compose.yml` (db + api + web). The
   default for hosts with Docker; also runnable with `podman compose`.
2. **Podman + systemd (Quadlet)** — `deploy/podman/` (`psa.network`,
   `psa-db.container`, `psa-api.container`, `psa-web.container`). The current
   Oracle target: systemd-managed, reboot-safe, no Docker required.

Both targets run the **same OCI images** built from the shared
`apps/api/Dockerfile` and `apps/web/Dockerfile`, with the same env contract
(`deploy/.env.example`) and the same reverse-proxy expectation (TLS terminated
by Caddy/nginx in front; `AUTH_COOKIE_SECURE=true` over HTTPS). Neither is a
CI/CD pipeline — both are runtime configuration, deployed manually by Watson
(per `AGENTS.md`). Secrets stay server-local and are never committed.

## Consequences

- When the runtime shape changes (a new service, port, env var, volume, or
  healthcheck), **update both** `deploy/docker-compose.yml` and
  `deploy/podman/` in the same change, and the shared `deploy/.env.example`.
  `deploy/README.md` documents both and is the deploy runbook.
- The Dockerfiles are the single source of truth for the images; the two
  targets differ only in how containers are orchestrated/supervised.
- Today: Oracle runs the Podman/Quadlet target. A future move to a
  Docker host uses the Compose target with no image changes.
- This decision is about orchestration only; it does not change the adopted
  stack (ADR 0001), the self-hosted-AI constraint, or the manual-deploy rule.
