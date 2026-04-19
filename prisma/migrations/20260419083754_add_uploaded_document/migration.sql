-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('BAYARAN', 'TUNGGAKAN', 'PENGHUNI', 'KUARTERS');

-- AlterEnum
ALTER TYPE "RecordStatus" ADD VALUE 'REJECTED';

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedById" UUID,
    "verifiedById" UUID,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "remark" TEXT,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadedDocument_category_idx" ON "UploadedDocument"("category");

-- CreateIndex
CREATE INDEX "UploadedDocument_recordStatus_idx" ON "UploadedDocument"("recordStatus");

-- CreateIndex
CREATE INDEX "UploadedDocument_uploadedAt_idx" ON "UploadedDocument"("uploadedAt");

-- CreateIndex
CREATE INDEX "UploadedDocument_uploadedById_idx" ON "UploadedDocument"("uploadedById");

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
