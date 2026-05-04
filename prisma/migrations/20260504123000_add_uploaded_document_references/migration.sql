ALTER TABLE "Resident"
ADD COLUMN "uploadedDocumentId" UUID;

ALTER TABLE "QuarterCategory"
ADD COLUMN "uploadedDocumentId" UUID;

ALTER TABLE "Unit"
ADD COLUMN "uploadedDocumentId" UUID;

ALTER TABLE "ArrearsSummary"
ADD COLUMN "uploadedDocumentId" UUID;

ALTER TABLE "Payment"
ADD COLUMN "uploadedDocumentId" UUID;

CREATE INDEX "Resident_uploadedDocumentId_idx" ON "Resident"("uploadedDocumentId");
CREATE INDEX "QuarterCategory_uploadedDocumentId_idx" ON "QuarterCategory"("uploadedDocumentId");
CREATE INDEX "Unit_uploadedDocumentId_idx" ON "Unit"("uploadedDocumentId");
CREATE INDEX "ArrearsSummary_uploadedDocumentId_idx" ON "ArrearsSummary"("uploadedDocumentId");
CREATE INDEX "Payment_uploadedDocumentId_idx" ON "Payment"("uploadedDocumentId");

ALTER TABLE "Resident"
ADD CONSTRAINT "Resident_uploadedDocumentId_fkey"
FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuarterCategory"
ADD CONSTRAINT "QuarterCategory_uploadedDocumentId_fkey"
FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Unit"
ADD CONSTRAINT "Unit_uploadedDocumentId_fkey"
FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ArrearsSummary"
ADD CONSTRAINT "ArrearsSummary_uploadedDocumentId_fkey"
FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_uploadedDocumentId_fkey"
FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
