import type { Prisma } from "@prisma/client";

import type {
  ExtractedQuarterRecord,
  ExtractedQuarterUnit,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";

export async function createPendingKuartersRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "kuarters") {
    return extractResult;
  }

  const records: ExtractedQuarterRecord[] = [];

  for (const record of extractResult.records) {
    const categoryAddress = record.address?.trim() || "N/A";
    const categoryDraft = await tx.quarterCategoryDraft.create({
      data: {
        categoryName: record.categoryName,
        address: categoryAddress,
        rentalPrice: record.rentalPrice || "0",
        maintenancePrice: record.maintenancePrice || "0",
        penaltyPrice: record.penaltyPrice || "0",
        uploadedDocumentId,
        originalCategoryId: null,
      },
    });
    const units: ExtractedQuarterUnit[] = [];

    for (const unit of record.units) {
      const unitDraft = await tx.unitDraft.create({
        data: {
          unitCode: unit.unitCode,
          uploadedDocumentId,
          categoryDraftId: categoryDraft.id,
          originalUnitId: null,
        },
      });

      units.push({
        ...unit,
        unitId: unitDraft.id,
        originalUnitId: undefined,
        isExisted: false,
      });
    }

    records.push({
      ...record,
      id: categoryDraft.id,
      categoryId: categoryDraft.id,
      originalCategoryId: undefined,
      categoryIsExisted: false,
      unitCount: units.length,
      units,
    });
  }

  return {
    ...extractResult,
    recordCount: records.length,
    totalUnits: records.reduce((total, record) => total + record.units.length, 0),
    records,
  };
}
