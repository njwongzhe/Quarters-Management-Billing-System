ALTER TABLE "ResidentDraft"
ADD COLUMN "quarterCategoryName" TEXT,
ADD COLUMN "quarterAddress" TEXT,
ADD COLUMN "unitCode" TEXT,
ADD COLUMN "moveInDate" TIMESTAMP(3),
ADD COLUMN "moveOutDate" TIMESTAMP(3);

UPDATE "ResidentDraft"
SET
  "quarterCategoryName" = COALESCE("rawData"->>'kuarters', "quarterCategoryName"),
  "quarterAddress" = COALESCE("rawData"->>'alamatKuarters', "description", "quarterAddress"),
  "unitCode" = COALESCE("rawData"->>'unit', "unitCode"),
  "moveInDate" = CASE
    WHEN COALESCE("rawData"->>'tarikhMasuk', '') ~ '^\d{4}-\d{2}-\d{2}' THEN ("rawData"->>'tarikhMasuk')::timestamp
    ELSE "moveInDate"
  END,
  "moveOutDate" = CASE
    WHEN COALESCE("rawData"->>'tarikhKeluar', '') ~ '^\d{4}-\d{2}-\d{2}' THEN ("rawData"->>'tarikhKeluar')::timestamp
    ELSE "moveOutDate"
  END;

ALTER TABLE "ResidentDraft" DROP COLUMN "rawData";
ALTER TABLE "QuarterCategoryDraft" DROP COLUMN "rawData";
ALTER TABLE "UnitDraft" DROP COLUMN "rawData";
ALTER TABLE "ArrearsSummaryDraft" DROP COLUMN "rawData";
ALTER TABLE "PaymentDraft" DROP COLUMN "rawData";
