import type { Prisma } from "@prisma/client";

import type { ExtractedQuarterRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";

function normalizeKuartersText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeKuartersMoney(value: unknown) {
  const normalizedValue =
    typeof value === "string" ? value.trim() : String(value ?? "");
  const amount = Number(normalizedValue.replace(/,/g, ""));

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

async function findCategoryConflictInSameDocument(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  categoryDraftId: string,
  categoryName: string,
  address: string,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategoryDraft"
    WHERE "id" <> ${categoryDraftId}::uuid
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return rows[0]?.id ?? "";
}

async function findUnitConflictInSameDraftCategory(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  categoryDraftId: string,
  unitDraftId: string,
  unitCode: string,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "UnitDraft"
    WHERE "id" <> ${unitDraftId}::uuid
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "categoryDraftId" = ${categoryDraftId}::uuid
      AND UPPER(TRIM(regexp_replace("unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${unitCode}, '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return rows[0]?.id ?? "";
}

export async function updateKuartersCategoryDraft(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  payload: object,
) {
  const body = payload as Record<string, unknown>;
  const categoryId = normalizeKuartersText(body.categoryId);
  const categoryName = normalizeKuartersText(body.categoryName);
  const address = normalizeKuartersText(body.address, "N/A");
  const rentalPrice = normalizeKuartersMoney(body.rentalPrice);
  const maintenancePrice = normalizeKuartersMoney(body.maintenancePrice);
  const penaltyPrice = normalizeKuartersMoney(body.penaltyPrice);

  if (!categoryId || !categoryName) {
    throw new Error("Data kategori kuarters tidak lengkap.");
  }

  const conflictId = await findCategoryConflictInSameDocument(
    tx,
    uploadedDocumentId,
    categoryId,
    categoryName,
    address,
  );

  if (conflictId) {
    throw new Error(
      `Kategori dan alamat kuarters bertindih dalam dokumen ini: ${categoryName}.`,
    );
  }

  const currentCategory = await tx.quarterCategoryDraft.findFirst({
    where: { id: categoryId, uploadedDocumentId },
  });

  if (!currentCategory) {
    throw new Error("Kategori kuarters tidak boleh dikemas kini.");
  }

  await tx.quarterCategoryDraft.update({
    where: { id: categoryId },
    data: {
      categoryName,
      address,
      rentalPrice,
      maintenancePrice,
      penaltyPrice,
    },
  });
}

export async function updateKuartersUnitDraft(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  payload: object,
) {
  const body = payload as Record<string, unknown>;
  const unitId = normalizeKuartersText(body.unitId);
  const categoryId = normalizeKuartersText(body.categoryId);
  const unitCode = normalizeKuartersText(body.unitCode);

  if (!unitId || !categoryId || !unitCode) {
    throw new Error("Data unit kuarters tidak lengkap.");
  }

  const conflictId = await findUnitConflictInSameDraftCategory(
    tx,
    uploadedDocumentId,
    categoryId,
    unitId,
    unitCode,
  );

  if (conflictId) {
    throw new Error(
      `Kod unit bertindih dalam dokumen ini untuk kategori yang sama: ${unitCode}.`,
    );
  }

  await tx.unitDraft.updateMany({
    where: { id: unitId, uploadedDocumentId, categoryDraftId: categoryId },
    data: { unitCode },
  });
}

export async function updateKuartersDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  records: ExtractedQuarterRecord[],
) {
  for (const record of records) {
    if (!record.categoryId) {
      continue;
    }

    const categoryName = normalizeKuartersText(record.categoryName);
    const address = normalizeKuartersText(record.address, "N/A");
    const conflictId = await findCategoryConflictInSameDocument(
      tx,
      uploadedDocumentId,
      record.categoryId,
      categoryName,
      address,
    );

    if (conflictId) {
      throw new Error(
        `Kategori dan alamat kuarters bertindih dalam dokumen ini: ${categoryName}.`,
      );
    }

    await tx.quarterCategoryDraft.updateMany({
      where: { id: record.categoryId, uploadedDocumentId },
      data: {
        categoryName,
        address,
        rentalPrice: normalizeKuartersMoney(record.rentalPrice),
        maintenancePrice: normalizeKuartersMoney(record.maintenancePrice),
        penaltyPrice: normalizeKuartersMoney(record.penaltyPrice),
      },
    });

    const nextUnitIds = new Set(
      record.units
        .map((unit) => unit.unitId)
        .filter((value): value is string => Boolean(value)),
    );

    await tx.unitDraft.deleteMany({
      where: {
        uploadedDocumentId,
        categoryDraftId: record.categoryId,
        id: { notIn: [...nextUnitIds] },
      },
    });

    for (const unit of record.units) {
      if (!unit.unitId || !unit.unitCode) {
        continue;
      }

      const unitConflictId = await findUnitConflictInSameDraftCategory(
        tx,
        uploadedDocumentId,
        record.categoryId,
        unit.unitId,
        unit.unitCode,
      );

      if (unitConflictId) {
        throw new Error(
          `Kod unit bertindih dalam dokumen ini untuk kategori yang sama: ${unit.unitCode}.`,
        );
      }

      await tx.unitDraft.updateMany({
        where: { id: unit.unitId, uploadedDocumentId },
        data: { unitCode: unit.unitCode },
      });
    }
  }
}
