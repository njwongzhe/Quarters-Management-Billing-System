import type { QueryClient } from "@/lib/uploaded-document/shared";

export async function findQuarterCategoryByNameAddress(
  tx: QueryClient,
  categoryName: string,
  address: string | null,
) {
  const categories = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategory"
    WHERE UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
      UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return categories[0]?.id ?? "";
}

export async function findQuarterCategoryByDetails(
  tx: QueryClient,
  categoryName: string,
  address: string | null,
  rentalPrice: string,
  maintenancePrice: string,
  penaltyPrice: string,
) {
  const categories = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategory"
    WHERE UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
      UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
      AND "rentalPrice" = ${rentalPrice}::numeric
      AND "maintenancePrice" = ${maintenancePrice}::numeric
      AND "penaltyPrice" = ${penaltyPrice}::numeric
    LIMIT 1
  `;

  return categories[0]?.id ?? "";
}

export async function findUnitByCategoryIdAndCode(
  tx: QueryClient,
  categoryId: string,
  unitCode: string,
) {
  const units = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Unit"
    WHERE "categoryId" = ${categoryId}::uuid
      AND UPPER(TRIM(regexp_replace("unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${unitCode}, '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return units[0]?.id ?? "";
}
