import type { DocumentCategory, Prisma, UploadedDocument } from "@prisma/client";

import type {
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedQuarterUnit,
  ExtractedTunggakanRecord,
  ExtractResult,
  KuartersExtractResult,
  ProcessingDraft,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";

export type UploadedDocumentWithUploader = UploadedDocument & {
  uploadedBy?: {
    fullName: string;
  } | null;
};

export function parseExtractResult(value: string | null): ExtractResult | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      "documentType" in parsed &&
      "records" in parsed
    ) {
      return parsed as ExtractResult;
    }
  } catch {
    return null;
  }

  return null;
}

export async function mapUploadedDocumentForQueue(
  document: UploadedDocumentWithUploader,
): Promise<ProcessingDraft | null> {
  return mapUploadedDocumentForReview(document);
}

export async function mapUploadedDocumentForReview(
  document: UploadedDocumentWithUploader,
): Promise<ProcessingDraft | null> {
  const extractResult = await buildExtractResultFromDraftRows(document);

  if (!extractResult) {
    return null;
  }

  return {
    id: document.id,
    kind: extractResult.documentType,
    fileName: document.originalName ?? document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadedBy: document.uploadedBy?.fullName ?? "Username",
    uploadedAt: document.uploadedAt.toISOString(),
    extractResult,
  };
}

export function documentCategoryForKind(kind: ProcessingDraft["kind"]) {
  return kind.toUpperCase() as DocumentCategory;
}

export function getBayaranPaymentDate(paymentMonth: string) {
  const [monthName, yearText] = paymentMonth.split(/\s+/);
  const monthIndexByName: Record<string, number> = {
    januari: 0,
    january: 0,
    februari: 1,
    february: 1,
    mac: 2,
    march: 2,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    june: 5,
    julai: 6,
    july: 6,
    ogos: 7,
    august: 7,
    september: 8,
    oktober: 9,
    october: 9,
    november: 10,
    disember: 11,
    december: 11,
  };
  const monthIndex = monthIndexByName[monthName?.toLowerCase() ?? ""] ?? 0;
  const year = Number(yearText) || new Date().getFullYear();

  return new Date(Date.UTC(year, monthIndex, 1));
}

async function buildExtractResultFromDraftRows(
  document: UploadedDocumentWithUploader,
): Promise<ExtractResult | null> {
  if (document.category === "BAYARAN") {
    return buildBayaranExtractResultFromDraftRows(document.id);
  }

  if (document.category === "TUNGGAKAN") {
    return buildTunggakanExtractResultFromDraftRows(document.id);
  }

  if (document.category === "PENGHUNI") {
    return buildPenghuniExtractResultFromDraftRows(document.id);
  }

  if (document.category === "KUARTERS") {
    return buildKuartersExtractResultFromDraftRows(document.id);
  }

  return null;
}

function jsonRecord<T>(value: Prisma.JsonValue | null, fallback: T): T {
  return value && typeof value === "object" && !Array.isArray(value)
    ? ({ ...fallback, ...value } as T)
    : fallback;
}

async function buildBayaranExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.paymentDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records = rows.map((row) =>
    jsonRecord<ExtractedBayaranRecord>(row.rawData, {
      paymentId: row.id,
      residentId: row.originalResidentId ?? undefined,
      isExisted: row.isExisted,
      page: 0,
      jabatanCode: "",
      jabatanName: "",
      ptjpkCode: "",
      ptjpkName: row.department ?? "",
      bil: "",
      noRujukan: row.referenceNo ?? row.receiptNo ?? "",
      noGajiNoKp: row.residentIcNumber,
      nama: row.residentName,
      amaunRm: row.amount.toFixed(2),
      tarikh: row.paymentDate.toISOString(),
      noResit: row.receiptNo ?? "",
      catatan: row.description ?? "",
    }),
  );

  const totalAmount = records
    .reduce((total, record) => total + Number(record.amaunRm || 0), 0)
    .toFixed(2);

  return {
    documentType: "bayaran" as const,
    recordCount: records.length,
    totalAmount,
    paymentMonth: rows[0]?.paymentDate.toLocaleDateString("ms-MY", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }) ?? "",
    records,
  };
}

async function buildTunggakanExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records = rows.map((row) =>
    jsonRecord<ExtractedTunggakanRecord>(row.rawData, {
      arrearsSummaryId: row.id,
      residentId: row.originalResidentId ?? undefined,
      isExisted: row.isExisted,
      importStatus: row.isExisted ? "IGNORED" : "PENDING",
      importMessage: row.isExisted
        ? "Rekod tunggakan telah wujud dalam sistem."
        : undefined,
      nama: row.residentName,
      noKadPengenalan: row.residentIcNumber,
      jumlahTunggakan: row.totalArrearsAmount.toFixed(2),
      sourceSheet: "",
      sourceRow: 0,
    }),
  );
  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    documentType: "tunggakan" as const,
    recordCount: acceptedRecords.length,
    totalAmount: acceptedRecords
      .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
      .toFixed(2),
    records,
  };
}

async function buildPenghuniExtractResultFromDraftRows(uploadedDocumentId: string) {
  const rows = await prisma.residentDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records = rows.map((row) =>
    jsonRecord<ExtractedPenghuniRecord>(row.rawData, {
      residentId: row.id,
      originalResidentId: row.originalResidentId ?? undefined,
      isExisted: row.isExisted,
      nama: row.fullName,
      noKadPengenalan: row.icNumber,
      kuarters: "",
      unit: "",
      alamatKuarters: row.description ?? "",
      perhubungan: row.phone ?? "",
      pekerjaan: row.position ?? "",
      jabatan: row.department ?? "",
      sourceSheet: "",
      sourceRow: 0,
    }),
  );

  return {
    documentType: "penghuni" as const,
    recordCount: records.length,
    records,
  };
}

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

  const records: ExtractedQuarterRecord[] = categories.map((category) => ({
    id: category.id,
    categoryId: category.id,
    categoryIsExisted: category.isExisted,
    originalCategoryId: category.originalCategoryId ?? undefined,
    categoryName: category.categoryName,
    address: category.address ?? "N/A",
    rentalPrice: category.rentalPrice.toFixed(2),
    maintenancePrice: category.maintenancePrice.toFixed(2),
    penaltyPrice: category.penaltyPrice.toFixed(2),
    unitCount: category.units.length,
    units: category.units.map((unit) => ({
      unitId: unit.id,
      originalUnitId: unit.originalUnitId ?? undefined,
      unitCode: unit.unitCode,
      address: category.address ?? "N/A",
      isExisted: unit.isExisted,
    })),
  }));

  return {
    documentType: "kuarters",
    recordCount: records.length,
    totalUnits: records.reduce((total, record) => total + record.units.length, 0),
    records,
  };
}

async function findResidentByNormalizedIc(
  tx: Prisma.TransactionClient,
  icNumber: string,
) {
  const residents = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') =
      regexp_replace(${icNumber}, '\\D', '', 'g')
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  return residents[0]?.id ?? "";
}

async function findQuarterCategoryByNameAddress(
  tx: Prisma.TransactionClient,
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

async function findUnitByCategoryIdAndCode(
  tx: Prisma.TransactionClient,
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

function rawData(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export async function createPendingBayaranRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "bayaran") {
    return extractResult;
  }

  const paymentDate = getBayaranPaymentDate(extractResult.paymentMonth);
  const records: ExtractedBayaranRecord[] = [];

  for (const record of extractResult.records) {
    const residentId = await findResidentByNormalizedIc(tx, record.noGajiNoKp);
    const existingPayment = await tx.payment.findFirst({
      where: {
        residentId: residentId || undefined,
        receiptNo: record.noRujukan || record.noResit || undefined,
        paymentDate,
      },
      select: { id: true },
    });
    const draft = await tx.paymentDraft.create({
      data: {
        residentName: record.nama,
        residentIcNumber: record.noGajiNoKp.trim(),
        department: record.ptjpkName || record.jabatanName || null,
        paymentDate,
        receiptNo: record.noResit || null,
        referenceNo: record.noRujukan || null,
        amount: record.amaunRm || "0",
        description: record.catatan || "bayaran",
        uploadedDocumentId,
        originalResidentId: residentId || null,
        originalPaymentId: existingPayment?.id ?? null,
        isExisted: Boolean(existingPayment?.id),
        rawData: rawData(record),
      },
    });

    records.push({
      ...record,
      paymentId: draft.id,
      residentId: residentId || undefined,
      isExisted: draft.isExisted,
    });
  }

  return { ...extractResult, recordCount: records.length, records };
}

function tunggakanIdentityKey(name: string, icNumber: string) {
  return [normalizeExtractText(name), icNumber.replace(/\D/g, "")].join("|");
}

function normalizeExtractText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

export async function createPendingTunggakanRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "tunggakan") {
    return extractResult;
  }

  const seen = new Set<string>();
  const records: ExtractedTunggakanRecord[] = [];

  for (const record of extractResult.records) {
    const icNumber = record.noKadPengenalan.trim();
    const identityKey = tunggakanIdentityKey(record.nama, icNumber);
    const residentId = await findResidentByNormalizedIc(tx, icNumber);
    const existingSummary = residentId
      ? await tx.arrearsSummary.findUnique({
          where: { residentId },
          select: { id: true },
        })
      : null;
    const isDuplicateInDocument = seen.has(identityKey);
    const isExisted = Boolean(existingSummary?.id || isDuplicateInDocument);
    const draft = await tx.arrearsSummaryDraft.create({
      data: {
        residentName: record.nama,
        residentIcNumber: icNumber,
        totalArrearsAmount: record.jumlahTunggakan || "0",
        description: "tunggakan",
        uploadedDocumentId,
        originalResidentId: residentId || null,
        originalSummaryId: existingSummary?.id ?? null,
        isExisted,
        rawData: rawData(record),
      },
    });

    seen.add(identityKey);
    records.push({
      ...record,
      arrearsSummaryId: draft.id,
      residentId: residentId || undefined,
      isExisted,
      importStatus: isExisted ? "IGNORED" : "PENDING",
      importMessage: isExisted
        ? isDuplicateInDocument
          ? "Rekod tunggakan pendua dalam fail ini."
          : "Rekod tunggakan telah wujud dalam sistem."
        : undefined,
    });
  }

  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    ...extractResult,
    recordCount: acceptedRecords.length,
    totalAmount: acceptedRecords
      .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
      .toFixed(2),
    records,
  };
}

export async function createPendingPenghuniRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "penghuni") {
    return extractResult;
  }

  const records: ExtractedPenghuniRecord[] = [];

  for (const record of extractResult.records) {
    const residentId = await findResidentByNormalizedIc(
      tx,
      record.noKadPengenalan,
    );
    const draft = await tx.residentDraft.create({
      data: {
        fullName: record.nama,
        icNumber: record.noKadPengenalan.trim(),
        phone: record.perhubungan || null,
        position: record.pekerjaan || null,
        department: record.jabatan || null,
        description: record.alamatKuarters || null,
        uploadedDocumentId,
        originalResidentId: residentId || null,
        isExisted: Boolean(residentId),
        rawData: rawData(record),
      },
    });

    records.push({
      ...record,
      residentId: draft.id,
      originalResidentId: residentId || undefined,
      isExisted: draft.isExisted,
    });
  }

  return { ...extractResult, recordCount: records.length, records };
}

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
    const originalCategoryId = await findQuarterCategoryByNameAddress(
      tx,
      record.categoryName,
      categoryAddress,
    );
    const categoryDraft = await tx.quarterCategoryDraft.create({
      data: {
        categoryName: record.categoryName,
        address: categoryAddress,
        rentalPrice: record.rentalPrice || "0",
        maintenancePrice: record.maintenancePrice || "0",
        penaltyPrice: record.penaltyPrice || "0",
        uploadedDocumentId,
        originalCategoryId: originalCategoryId || null,
        isExisted: Boolean(originalCategoryId),
        rawData: rawData(record),
      },
    });
    const units: ExtractedQuarterUnit[] = [];

    for (const unit of record.units) {
      const originalUnitId = originalCategoryId
        ? await findUnitByCategoryIdAndCode(tx, originalCategoryId, unit.unitCode)
        : "";
      const unitDraft = await tx.unitDraft.create({
        data: {
          unitCode: unit.unitCode,
          uploadedDocumentId,
          categoryDraftId: categoryDraft.id,
          originalUnitId: originalUnitId || null,
          isExisted: Boolean(originalUnitId),
          rawData: rawData(unit),
        },
      });

      units.push({
        ...unit,
        unitId: unitDraft.id,
        originalUnitId: originalUnitId || undefined,
        isExisted: unitDraft.isExisted,
      });
    }

    records.push({
      ...record,
      id: categoryDraft.id,
      categoryId: categoryDraft.id,
      originalCategoryId: originalCategoryId || undefined,
      categoryIsExisted: categoryDraft.isExisted,
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

export async function applyVerifiedPenghuniOccupancy(
  tx: Prisma.TransactionClient,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "penghuni") {
    return;
  }

  const touchedUnitIds = new Set<string>();

  for (const record of extractResult.records) {
    const residentId =
      "originalResidentId" in record && typeof record.originalResidentId === "string"
        ? record.originalResidentId
        : await findResidentByNormalizedIc(tx, record.noKadPengenalan);

    if (!residentId) {
      continue;
    }

    const unitId = await findUnitIdForPenghuniRecord(tx, record.kuarters, record.unit);

    if (!unitId) {
      continue;
    }

    touchedUnitIds.add(unitId);

    await tx.$executeRaw`
      UPDATE "UnitOccupancy"
      SET "status" = 'PAST'::"OccupancyStatus", "moveOutDate" = COALESCE("moveOutDate", NOW()), "updatedAt" = NOW()
      WHERE "residentId" = ${residentId}::uuid
        AND "status" = 'CURRENT'::"OccupancyStatus"
        AND "unitId" <> ${unitId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE "UnitOccupancy"
      SET "status" = 'PAST'::"OccupancyStatus", "moveOutDate" = COALESCE("moveOutDate", NOW()), "updatedAt" = NOW()
      WHERE "unitId" = ${unitId}::uuid
        AND "residentId" <> ${residentId}::uuid
        AND "status" = 'CURRENT'::"OccupancyStatus"
    `;

    await tx.$executeRaw`
      INSERT INTO "UnitOccupancy"
        ("id", "residentId", "unitId", "moveInDate", "status", "description", "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        ${residentId}::uuid,
        ${unitId}::uuid,
        ${parsePenghuniMoveInDate(record.tarikhMasuk ?? "")},
        'CURRENT'::"OccupancyStatus",
        ${"Dicipta selepas pengesahan dokumen penghuni."},
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM "UnitOccupancy"
        WHERE "residentId" = ${residentId}::uuid
          AND "unitId" = ${unitId}::uuid
          AND "status" = 'CURRENT'::"OccupancyStatus"
      )
    `;
  }

  for (const unitId of touchedUnitIds) {
    await tx.unit.update({
      where: { id: unitId },
      data: { status: "OCCUPIED" },
    });
  }
}

async function findUnitIdForPenghuniRecord(
  tx: Prisma.TransactionClient,
  kuarters: string,
  unit: string,
) {
  const normalizedUnit = unit.trim();
  const normalizedKuarters = kuarters.trim();

  if (!normalizedUnit) {
    return "";
  }

  const units = await tx.$queryRaw<{ id: string }[]>`
    SELECT u."id"
    FROM "Unit" u
    INNER JOIN "QuarterCategory" qc
      ON qc."id" = u."categoryId"
    WHERE UPPER(TRIM(u."unitCode")) = UPPER(TRIM(${normalizedUnit}))
      AND (
        ${normalizedKuarters} = ''
        OR UPPER(TRIM(qc."categoryName")) = UPPER(TRIM(${normalizedKuarters}))
        OR UPPER(TRIM(qc."address")) = UPPER(TRIM(${normalizedKuarters}))
      )
    ORDER BY
      CASE
        WHEN UPPER(TRIM(qc."categoryName")) = UPPER(TRIM(${normalizedKuarters})) THEN 0
        WHEN UPPER(TRIM(qc."address")) = UPPER(TRIM(${normalizedKuarters})) THEN 1
        ELSE 2
      END
    LIMIT 1
  `;

  return units[0]?.id ?? "";
}

function parsePenghuniMoveInDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}
