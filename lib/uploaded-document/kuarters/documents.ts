import type {
  ExtractedQuarterRecord,
  ExtractedQuarterUnit,
  KuartersExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import {
  findQuarterCategoryByDetails,
  findQuarterCategoryByNameAddress,
  findUnitByCategoryIdAndCode,
} from "@/lib/uploaded-document/kuarters/queries";

export async function buildKuartersExtractResultFromDraftRows(
  uploadedDocumentId: string,
): Promise<KuartersExtractResult | null> {
  const categories = await prisma.quarterCategoryDraft.findMany({
    where: { uploadedDocumentId },
    include: { units: { orderBy: [{ unitCode: "asc" }, { createdAt: "asc" }] } },
    orderBy: [{ categoryName: "asc" }, { createdAt: "asc" }],
  });

  if (categories.length === 0) {
    return null;
  }

  const records: ExtractedQuarterRecord[] = [];

  for (const category of categories) {
    const address = category.address ?? "N/A";
    const originalCategoryId = await findQuarterCategoryByNameAddress(
      prisma,
      category.categoryName,
      address,
    );
    const exactCategoryId = await findQuarterCategoryByDetails(
      prisma,
      category.categoryName,
      address,
      category.rentalPrice.toFixed(2),
      category.maintenancePrice.toFixed(2),
      category.penaltyPrice.toFixed(2),
    );
    const units: ExtractedQuarterUnit[] = [];

    for (const unit of category.units) {
      const originalUnitId = originalCategoryId
        ? await findUnitByCategoryIdAndCode(prisma, originalCategoryId, unit.unitCode)
        : "";

      units.push({
        unitId: unit.id,
        originalUnitId: originalUnitId || undefined,
        unitCode: unit.unitCode,
        address,
        isExisted: Boolean(originalUnitId),
      });
    }

    records.push({
      id: category.id,
      categoryId: category.id,
      categoryIsExisted: Boolean(exactCategoryId),
      originalCategoryId: originalCategoryId || undefined,
      categoryName: category.categoryName,
      address,
      rentalPrice: category.rentalPrice.toFixed(2),
      maintenancePrice: category.maintenancePrice.toFixed(2),
      penaltyPrice: category.penaltyPrice.toFixed(2),
      unitCount: category.units.length,
      units,
    });
  }

  return {
    documentType: "kuarters",
    recordCount: records.length,
    totalUnits: records.reduce((total, record) => total + record.units.length, 0),
    records,
  };
}
