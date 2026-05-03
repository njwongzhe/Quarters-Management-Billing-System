-- AlterTable
ALTER TABLE "QuarterCategory" RENAME CONSTRAINT "QuarterClass_pkey" TO "QuarterCategory_pkey";

-- RenameForeignKey
ALTER TABLE "QuarterCategory" RENAME CONSTRAINT "QuarterClass_createdById_fkey" TO "QuarterCategory_createdById_fkey";

-- RenameForeignKey
ALTER TABLE "QuarterCategory" RENAME CONSTRAINT "QuarterClass_verifiedById_fkey" TO "QuarterCategory_verifiedById_fkey";

-- RenameIndex
ALTER INDEX "QuarterClass_recordStatus_idx" RENAME TO "QuarterCategory_recordStatus_idx";
