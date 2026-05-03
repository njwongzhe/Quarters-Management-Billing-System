-- Drop the old category-name-only uniqueness rule.
DROP INDEX IF EXISTS "QuarterCategory_categoryName_key";

-- Category names can repeat across different addresses, and addresses can repeat
-- across different category names. The pair must remain unique.
CREATE UNIQUE INDEX "QuarterCategory_categoryName_address_key"
  ON "QuarterCategory"("categoryName", "address");
