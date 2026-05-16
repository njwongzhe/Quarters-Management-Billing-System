DROP INDEX IF EXISTS "QuarterCategoryDraft_isExisted_idx";
DROP INDEX IF EXISTS "UnitDraft_isExisted_idx";

ALTER TABLE "QuarterCategoryDraft" DROP COLUMN IF EXISTS "isExisted";
ALTER TABLE "UnitDraft" DROP COLUMN IF EXISTS "isExisted";
