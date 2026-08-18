-- CreateEnum
CREATE TYPE "test_import_status" AS ENUM ('received', 'parsed');

-- CreateTable
CREATE TABLE "test_import" (
    "id" UUID NOT NULL,
    "partnership_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "status" "test_import_status" NOT NULL DEFAULT 'received',
    "payload" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_import_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_import_partnership_id_idx" ON "test_import"("partnership_id");

-- AddForeignKey
ALTER TABLE "test_import" ADD CONSTRAINT "test_import_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
