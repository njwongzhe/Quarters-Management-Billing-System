-- AlterTable
ALTER TABLE "QuarterClass" ADD COLUMN "address" TEXT;

-- RenameColumn
ALTER TABLE "UnitOccupancy" RENAME COLUMN "notes" TO "description";

-- RenameColumn
ALTER TABLE "MonthlyCharge" RENAME COLUMN "notes" TO "description";

-- RenameColumn
ALTER TABLE "Payment" RENAME COLUMN "notes" TO "description";

-- RenameColumn
ALTER TABLE "Transaction" RENAME COLUMN "notes" TO "description";

-- RenameColumn
ALTER TABLE "UploadedDocument" RENAME COLUMN "notes" TO "description";
