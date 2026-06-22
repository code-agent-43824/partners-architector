-- Runs once, on first initialization of an empty database volume.
--
-- The canonical enabler of the pgvector extension is the Prisma migration
-- added in step 0.4; this script keeps the extension present for manual or
-- dev use of the `db` service on a fresh volume. Safe to run repeatedly.
CREATE EXTENSION IF NOT EXISTS vector;
