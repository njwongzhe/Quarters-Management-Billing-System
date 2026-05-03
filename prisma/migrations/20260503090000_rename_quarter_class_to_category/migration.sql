ALTER TYPE "EntityType" RENAME VALUE 'QUARTER_CLASS' TO 'QUARTER_CATEGORY';

ALTER TABLE "Unit" DROP CONSTRAINT "Unit_classId_fkey";

ALTER TABLE "Unit" RENAME COLUMN "classId" TO "categoryId";

ALTER TABLE "QuarterClass" RENAME TO "QuarterCategory";

ALTER TABLE "QuarterCategory" RENAME COLUMN "className" TO "categoryName";

ALTER INDEX IF EXISTS "QuarterClass_className_key" RENAME TO "QuarterCategory_categoryName_key";
ALTER INDEX IF EXISTS "Unit_classId_idx" RENAME TO "Unit_categoryId_idx";
ALTER INDEX IF EXISTS "Unit_classId_unitCode_key" RENAME TO "Unit_categoryId_unitCode_key";

ALTER TABLE "Unit"
  ADD CONSTRAINT "Unit_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "QuarterCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
