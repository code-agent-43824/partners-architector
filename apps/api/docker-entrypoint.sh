#!/bin/sh
# Apply pending migrations, then start the API. Idempotent and safe to re-run
# on every container start (single-instance MVP). For multi-instance setups,
# run migrations as a separate one-off step instead.
set -e
cd /repo/apps/api
echo "[entrypoint] applying database migrations…"
pnpm exec prisma migrate deploy
echo "[entrypoint] starting API…"
exec node dist/main.js
