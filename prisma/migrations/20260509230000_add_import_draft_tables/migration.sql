-- Draft imports replace the old "pending rows in real tables" workflow.

ALTER TABLE "Resident" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "QuarterCategory" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "Unit" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "ArrearsSummary" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "MonthlyCharge" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "AdditionalCharge" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "Rebate" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "recordStatus";
ALTER TABLE "UploadedDocument" DROP COLUMN IF EXISTS "recordStatus";

CREATE TABLE "ResidentDraft" (
  "id" UUID NOT NULL,
  "fullName" TEXT NOT NULL,
  "icNumber" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "position" TEXT,
  "department" TEXT,
  "serviceLevel" TEXT,
  "status" "ResidentStatus" NOT NULL DEFAULT 'AKTIF',
  "description" TEXT,
  "uploadedDocumentId" UUID NOT NULL,
  "originalResidentId" UUID,
  "isExisted" BOOLEAN NOT NULL DEFAULT false,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResidentDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuarterCategoryDraft" (
  "id" UUID NOT NULL,
  "categoryName" TEXT NOT NULL,
  "address" TEXT,
  "rentalPrice" DECIMAL(12,2) NOT NULL,
  "maintenancePrice" DECIMAL(12,2) NOT NULL,
  "penaltyPrice" DECIMAL(12,2) NOT NULL,
  "uploadedDocumentId" UUID NOT NULL,
  "originalCategoryId" UUID,
  "isExisted" BOOLEAN NOT NULL DEFAULT false,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuarterCategoryDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitDraft" (
  "id" UUID NOT NULL,
  "unitCode" TEXT NOT NULL,
  "status" "UnitStatus" NOT NULL DEFAULT 'VACANT',
  "uploadedDocumentId" UUID NOT NULL,
  "categoryDraftId" UUID,
  "originalUnitId" UUID,
  "isExisted" BOOLEAN NOT NULL DEFAULT false,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UnitDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArrearsSummaryDraft" (
  "id" UUID NOT NULL,
  "residentName" TEXT NOT NULL,
  "residentIcNumber" TEXT NOT NULL,
  "totalArrearsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lastUpdatedMonth" TIMESTAMP(3),
  "description" TEXT,
  "uploadedDocumentId" UUID NOT NULL,
  "originalResidentId" UUID,
  "originalSummaryId" UUID,
  "isExisted" BOOLEAN NOT NULL DEFAULT false,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArrearsSummaryDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentDraft" (
  "id" UUID NOT NULL,
  "residentName" TEXT NOT NULL,
  "residentIcNumber" TEXT NOT NULL,
  "department" TEXT,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "receiptNo" TEXT,
  "referenceNo" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT,
  "uploadedDocumentId" UUID NOT NULL,
  "originalResidentId" UUID,
  "originalPaymentId" UUID,
  "isExisted" BOOLEAN NOT NULL DEFAULT false,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResidentDraft_uploadedDocumentId_idx" ON "ResidentDraft"("uploadedDocumentId");
CREATE INDEX "ResidentDraft_icNumber_idx" ON "ResidentDraft"("icNumber");
CREATE INDEX "ResidentDraft_isExisted_idx" ON "ResidentDraft"("isExisted");
CREATE INDEX "QuarterCategoryDraft_uploadedDocumentId_idx" ON "QuarterCategoryDraft"("uploadedDocumentId");
CREATE INDEX "QuarterCategoryDraft_isExisted_idx" ON "QuarterCategoryDraft"("isExisted");
CREATE INDEX "UnitDraft_uploadedDocumentId_idx" ON "UnitDraft"("uploadedDocumentId");
CREATE INDEX "UnitDraft_categoryDraftId_idx" ON "UnitDraft"("categoryDraftId");
CREATE INDEX "UnitDraft_isExisted_idx" ON "UnitDraft"("isExisted");
CREATE INDEX "ArrearsSummaryDraft_uploadedDocumentId_idx" ON "ArrearsSummaryDraft"("uploadedDocumentId");
CREATE INDEX "ArrearsSummaryDraft_residentIcNumber_idx" ON "ArrearsSummaryDraft"("residentIcNumber");
CREATE INDEX "ArrearsSummaryDraft_isExisted_idx" ON "ArrearsSummaryDraft"("isExisted");
CREATE INDEX "PaymentDraft_uploadedDocumentId_idx" ON "PaymentDraft"("uploadedDocumentId");
CREATE INDEX "PaymentDraft_residentIcNumber_idx" ON "PaymentDraft"("residentIcNumber");
CREATE INDEX "PaymentDraft_isExisted_idx" ON "PaymentDraft"("isExisted");

ALTER TABLE "ResidentDraft"
  ADD CONSTRAINT "ResidentDraft_uploadedDocumentId_fkey"
  FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuarterCategoryDraft"
  ADD CONSTRAINT "QuarterCategoryDraft_uploadedDocumentId_fkey"
  FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnitDraft"
  ADD CONSTRAINT "UnitDraft_uploadedDocumentId_fkey"
  FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnitDraft"
  ADD CONSTRAINT "UnitDraft_categoryDraftId_fkey"
  FOREIGN KEY ("categoryDraftId") REFERENCES "QuarterCategoryDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArrearsSummaryDraft"
  ADD CONSTRAINT "ArrearsSummaryDraft_uploadedDocumentId_fkey"
  FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentDraft"
  ADD CONSTRAINT "PaymentDraft_uploadedDocumentId_fkey"
  FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TYPE IF EXISTS "RecordStatus";
