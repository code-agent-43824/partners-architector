-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'architect', 'client');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "partnership_tag" AS ENUM ('new', 'existing', 'with_investor', 'employee_options', 'collaboration', 'other');

-- CreateEnum
CREATE TYPE "partnership_status" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "session_kind" AS ENUM ('initial', 'review');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('draft', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "clause_status" AS ENUM ('not_started', 'in_progress', 'parked', 'agreed', 'disputed', 'not_applicable');

-- CreateEnum
CREATE TYPE "clause_source" AS ENUM ('manual', 'ai_draft', 'ai_edited');

-- CreateEnum
CREATE TYPE "carrier" AS ENUM ('partnership_agreement', 'charter', 'shareholders_agreement', 'employment_contract', 'job_description', 'option_agreement', 'term_sheet', 'investment_memo', 'prenup', 'will', 'local_act');

-- CreateEnum
CREATE TYPE "legal_mapping_status" AS ENUM ('pending', 'done', 'na');

-- CreateEnum
CREATE TYPE "finding_type" AS ENUM ('gap', 'contradiction', 'missing_signoff', 'parked_heavy', 'empty_cell', 'shares_sum', 'calc_incomplete', 'no_review_date');

-- CreateEnum
CREATE TYPE "finding_severity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "finding_status" AS ENUM ('open', 'dismissed', 'resolved');

-- CreateEnum
CREATE TYPE "finding_source" AS ENUM ('rule', 'ai');

-- CreateEnum
CREATE TYPE "questionnaire_invite_status" AS ENUM ('sent', 'opened', 'submitted');

-- CreateEnum
CREATE TYPE "client_artifact_kind" AS ENUM ('agreement', 'legalization', 'other');

-- CreateEnum
CREATE TYPE "artifact_visibility" AS ENUM ('all', 'specific');

-- CreateEnum
CREATE TYPE "export_kind" AS ENUM ('agreement', 'legalization');

-- CreateEnum
CREATE TYPE "export_format" AS ENUM ('pdf', 'docx', 'csv');

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "status" "account_status" NOT NULL DEFAULT 'active',
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnership" (
    "id" UUID NOT NULL,
    "owner_account_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type_tags" "partnership_tag"[] DEFAULT ARRAY[]::"partnership_tag"[],
    "status" "partnership_status" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner" (
    "id" UUID NOT NULL,
    "partnership_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT,
    "contact" TEXT,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "partnership_id" UUID NOT NULL,
    "kind" "session_kind" NOT NULL,
    "title" TEXT,
    "status" "session_status" NOT NULL DEFAULT 'draft',
    "baseline_session_id" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT,
    "helper_questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "applies_to" JSONB,
    "order_index" INTEGER NOT NULL,
    "question_set_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clause" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "status" "clause_status" NOT NULL DEFAULT 'not_started',
    "text" TEXT,
    "rationale" TEXT,
    "na_reason" TEXT,
    "source" "clause_source" NOT NULL DEFAULT 'manual',
    "structured_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clause_signoff" (
    "id" UUID NOT NULL,
    "clause_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "agreed" BOOLEAN NOT NULL DEFAULT false,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clause_signoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clause_version" (
    "id" UUID NOT NULL,
    "clause_id" UUID NOT NULL,
    "text" TEXT,
    "rationale" TEXT,
    "status" "clause_status" NOT NULL,
    "note" TEXT,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clause_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_calculation" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "weights" JSONB,
    "economic" JSONB,
    "human" JSONB,
    "social" JSONB,
    "result" JSONB,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_calculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrix_decision" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matrix_cell" (
    "id" UUID NOT NULL,
    "matrix_decision_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "level" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_mapping" (
    "id" UUID NOT NULL,
    "clause_id" UUID NOT NULL,
    "carrier" "carrier" NOT NULL,
    "status" "legal_mapping_status" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consistency_finding" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "type" "finding_type" NOT NULL,
    "related_refs" JSONB,
    "description" TEXT,
    "severity" "finding_severity" NOT NULL DEFAULT 'warning',
    "status" "finding_status" NOT NULL DEFAULT 'open',
    "source" "finding_source" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consistency_finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_invite" (
    "id" UUID NOT NULL,
    "partnership_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "account_id" UUID,
    "token" TEXT NOT NULL,
    "status" "questionnaire_invite_status" NOT NULL DEFAULT 'sent',
    "question_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_answer" (
    "id" UUID NOT NULL,
    "invite_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "text" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_access" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "partnership_id" UUID NOT NULL,
    "partner_id" UUID,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_artifact" (
    "id" UUID NOT NULL,
    "partnership_id" UUID NOT NULL,
    "kind" "client_artifact_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "visibility" "artifact_visibility" NOT NULL DEFAULT 'all',
    "visible_partner_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_by" UUID NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_record" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "kind" "export_kind" NOT NULL,
    "format" "export_format" NOT NULL,
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "inference_base_url" TEXT,
    "llm_model" TEXT,
    "asr_model" TEXT,
    "embed_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_email_key" ON "account"("email");

-- CreateIndex
CREATE INDEX "partnership_owner_account_id_idx" ON "partnership"("owner_account_id");

-- CreateIndex
CREATE INDEX "partner_partnership_id_idx" ON "partner"("partnership_id");

-- CreateIndex
CREATE INDEX "session_partnership_id_idx" ON "session"("partnership_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_question_set_version_number_key" ON "question"("question_set_version", "number");

-- CreateIndex
CREATE INDEX "clause_session_id_idx" ON "clause"("session_id");

-- CreateIndex
CREATE INDEX "clause_question_id_idx" ON "clause"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "clause_session_id_question_id_key" ON "clause"("session_id", "question_id");

-- CreateIndex
CREATE INDEX "clause_signoff_clause_id_idx" ON "clause_signoff"("clause_id");

-- CreateIndex
CREATE UNIQUE INDEX "clause_signoff_clause_id_partner_id_key" ON "clause_signoff"("clause_id", "partner_id");

-- CreateIndex
CREATE INDEX "clause_version_clause_id_idx" ON "clause_version"("clause_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_calculation_session_id_key" ON "share_calculation"("session_id");

-- CreateIndex
CREATE INDEX "matrix_decision_session_id_idx" ON "matrix_decision"("session_id");

-- CreateIndex
CREATE INDEX "matrix_cell_matrix_decision_id_idx" ON "matrix_cell"("matrix_decision_id");

-- CreateIndex
CREATE UNIQUE INDEX "matrix_cell_matrix_decision_id_partner_id_key" ON "matrix_cell"("matrix_decision_id", "partner_id");

-- CreateIndex
CREATE INDEX "legal_mapping_clause_id_idx" ON "legal_mapping"("clause_id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_mapping_clause_id_carrier_key" ON "legal_mapping"("clause_id", "carrier");

-- CreateIndex
CREATE INDEX "consistency_finding_session_id_idx" ON "consistency_finding"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_invite_token_key" ON "questionnaire_invite"("token");

-- CreateIndex
CREATE INDEX "questionnaire_invite_partnership_id_idx" ON "questionnaire_invite"("partnership_id");

-- CreateIndex
CREATE INDEX "questionnaire_answer_invite_id_idx" ON "questionnaire_answer"("invite_id");

-- CreateIndex
CREATE INDEX "client_access_partnership_id_idx" ON "client_access"("partnership_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_access_account_id_partnership_id_key" ON "client_access"("account_id", "partnership_id");

-- CreateIndex
CREATE INDEX "client_artifact_partnership_id_idx" ON "client_artifact"("partnership_id");

-- CreateIndex
CREATE INDEX "export_record_session_id_idx" ON "export_record"("session_id");

-- AddForeignKey
ALTER TABLE "partnership" ADD CONSTRAINT "partnership_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner" ADD CONSTRAINT "partner_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_baseline_session_id_fkey" FOREIGN KEY ("baseline_session_id") REFERENCES "session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause" ADD CONSTRAINT "clause_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause" ADD CONSTRAINT "clause_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_signoff" ADD CONSTRAINT "clause_signoff_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_signoff" ADD CONSTRAINT "clause_signoff_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_version" ADD CONSTRAINT "clause_version_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_calculation" ADD CONSTRAINT "share_calculation_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_decision" ADD CONSTRAINT "matrix_decision_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_cell" ADD CONSTRAINT "matrix_cell_matrix_decision_id_fkey" FOREIGN KEY ("matrix_decision_id") REFERENCES "matrix_decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matrix_cell" ADD CONSTRAINT "matrix_cell_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_mapping" ADD CONSTRAINT "legal_mapping_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consistency_finding" ADD CONSTRAINT "consistency_finding_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_invite" ADD CONSTRAINT "questionnaire_invite_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_invite" ADD CONSTRAINT "questionnaire_invite_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_invite" ADD CONSTRAINT "questionnaire_invite_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_answer" ADD CONSTRAINT "questionnaire_answer_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "questionnaire_invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_answer" ADD CONSTRAINT "questionnaire_answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_artifact" ADD CONSTRAINT "client_artifact_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_artifact" ADD CONSTRAINT "client_artifact_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_record" ADD CONSTRAINT "export_record_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Authority-matrix level is I–V (1..5) or empty; enforce the range at the DB.
ALTER TABLE "matrix_cell"
    ADD CONSTRAINT "matrix_cell_level_range" CHECK ("level" IS NULL OR ("level" BETWEEN 1 AND 5));
