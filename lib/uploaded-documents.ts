import type { DocumentCategory, Prisma, UploadedDocument } from "@prisma/client";
import { randomUUID } from "crypto";

import type {
  ExtractResult,
  ProcessingDraft,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";

export type UploadedDocumentWithUploader = UploadedDocument & {
  uploadedBy?: {
    fullName: string;
  } | null;
};

// Define a list of valid document categories for filtering
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

// Define valid document categories for filtering in GET handler
export function mapUploadedDocumentForQueue(
  document: UploadedDocumentWithUploader,
): ProcessingDraft | null {
  const extractResult = parseExtractResult(document.remark);

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

async function findResidentByIcNumber(
  tx: Prisma.TransactionClient,
  icNumber: string,
) {
  const residents = await tx.$queryRaw<
    { id: string; recordStatus: "PENDING" | "VERIFIED" | "REJECTED" }[]
  >`
    SELECT "id", "recordStatus"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') =
      regexp_replace(${icNumber}, '\\D', '', 'g')
    ORDER BY
      CASE WHEN "icNumber" = ${icNumber} THEN 0 ELSE 1 END,
      "createdAt" ASC
    LIMIT 1
  `;

  return residents[0] ?? null;
}

async function findResidentByIcNumberAndName(
  tx: Prisma.TransactionClient,
  icNumber: string,
  fullName: string,
) {
  const residents = await tx.$queryRaw<
    { id: string; recordStatus: "PENDING" | "VERIFIED" | "REJECTED" }[]
  >`
    SELECT "id", "recordStatus"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') =
      regexp_replace(${icNumber}, '\\D', '', 'g')
      AND UPPER(TRIM(regexp_replace("fullName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${fullName}, '\\s+', ' ', 'g')))
    ORDER BY
      CASE WHEN "recordStatus" = 'VERIFIED'::"RecordStatus" THEN 0 ELSE 1 END,
      "createdAt" ASC
    LIMIT 1
  `;

  return residents[0] ?? null;
}

async function findArrearsSummaryByResidentId(
  tx: Prisma.TransactionClient,
  residentId: string,
) {
  const arrearsSummaries = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "ArrearsSummary"
    WHERE "residentId" = ${residentId}::uuid
    ORDER BY
      CASE WHEN "recordStatus" = 'VERIFIED'::"RecordStatus" THEN 0 ELSE 1 END,
      "createdAt" ASC
    LIMIT 1
  `;

  return arrearsSummaries[0]?.id ?? "";
}

function tunggakanIdentityKey(name: string, icNumber: string) {
  return [normalizeExtractText(name), icNumber.replace(/\D/g, "")].join("|");
}

function normalizeExtractText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
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
    ORDER BY
      CASE WHEN "recordStatus" = 'VERIFIED'::"RecordStatus" THEN 0 ELSE 1 END,
      "createdAt" ASC
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
    ORDER BY
      CASE WHEN "recordStatus" = 'VERIFIED'::"RecordStatus" THEN 0 ELSE 1 END,
      "createdAt" ASC
    LIMIT 1
  `;

  return units[0]?.id ?? "";
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
  const enrichedRecords = [];

  for (const record of extractResult.records) {
    const icNumber = record.noGajiNoKp.trim();
    const resident = await findResidentByIcNumber(tx, icNumber);
    let residentId = resident?.id;
    let residentRecordStatus = resident?.recordStatus;

    if (!residentId) {
      const nextResidentId = randomUUID();
      const createdResidents = await tx.$queryRaw<
        { id: string; recordStatus: "PENDING" | "VERIFIED" | "REJECTED" }[]
      >`
        INSERT INTO "Resident"
          ("id", "fullName", "icNumber", "department", "recordStatus", "uploadedDocumentId", "description", "createdAt", "updatedAt")
        VALUES
          (${nextResidentId}::uuid, ${record.nama}, ${icNumber}, ${record.ptjpkName || record.jabatanName || null}, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, ${"Dicipta sementara daripada dokumen bayaran belum disahkan."}, NOW(), NOW())
        RETURNING "id", "recordStatus"
      `;
      residentId = createdResidents[0]?.id ?? nextResidentId;
      residentRecordStatus = createdResidents[0]?.recordStatus ?? "PENDING";
    }

    const paymentId = randomUUID();
    const payments = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "Payment"
        ("id", "residentId", "paymentDate", "receiptNo", "amount", "description", "recordStatus", "uploadedDocumentId", "createdAt", "updatedAt")
      VALUES
        (${paymentId}::uuid, ${residentId}::uuid, ${paymentDate}, ${record.noRujukan || null}, ${record.amaunRm}::numeric, ${record.catatan || "bayaran"}, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, NOW(), NOW())
      RETURNING "id"
    `;

    enrichedRecords.push({
      ...record,
      paymentId: payments[0]?.id ?? paymentId,
      residentId,
      residentRecordStatus,
    });
  }

  return {
    ...extractResult,
    records: enrichedRecords,
  };
}

export async function createPendingTunggakanRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "tunggakan") {
    return extractResult;
  }

  const enrichedRecords = [];
  const acceptedTunggakanKeys = new Set<string>();

  for (const record of extractResult.records) {
    const icNumber = record.noKadPengenalan.trim();
    const identityKey = tunggakanIdentityKey(record.nama, icNumber);
    const existingResident = await findResidentByIcNumberAndName(
      tx,
      icNumber,
      record.nama,
    );
    const residentWithSameIc = existingResident
      ? null
      : await findResidentByIcNumber(tx, icNumber);

    let residentId = existingResident?.id;
    let residentRecordStatus = existingResident?.recordStatus;

    if (acceptedTunggakanKeys.has(identityKey)) {
      enrichedRecords.push({
        ...record,
        residentId,
        residentRecordStatus,
        importStatus: "IGNORED" as const,
        importMessage:
          "Rekod tunggakan pendua dalam fail ini telah diabaikan. Rekod pertama dikekalkan.",
      });
      continue;
    }

    if (residentId) {
      const existingArrearsSummaryId = await findArrearsSummaryByResidentId(
        tx,
        residentId,
      );

      if (existingArrearsSummaryId) {
        enrichedRecords.push({
          ...record,
          arrearsSummaryId: existingArrearsSummaryId,
          residentId,
          residentRecordStatus,
          importStatus: "IGNORED" as const,
          importMessage:
            "Rekod tunggakan pertama telah wujud untuk nama dan IC ini. Amaun baharu diabaikan.",
        });
        continue;
      }
    }

    if (!residentId && residentWithSameIc) {
      enrichedRecords.push({
        ...record,
        residentId: residentWithSameIc.id,
        residentRecordStatus: residentWithSameIc.recordStatus,
        importStatus: "IGNORED" as const,
        importMessage:
          "IC telah wujud tetapi nama tidak sepadan. Semak nama dan IC sebelum import.",
      });
      continue;
    }

    if (!residentId) {
      const nextResidentId = randomUUID();
      const createdResidents = await tx.$queryRaw<
        { id: string; recordStatus: "PENDING" | "VERIFIED" | "REJECTED" }[]
      >`
        INSERT INTO "Resident"
          ("id", "fullName", "icNumber", "recordStatus", "uploadedDocumentId", "description", "createdAt", "updatedAt")
        VALUES
          (${nextResidentId}::uuid, ${record.nama}, ${icNumber}, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, ${"Dicipta sementara daripada dokumen tunggakan belum disahkan."}, NOW(), NOW())
        RETURNING "id", "recordStatus"
      `;
      residentId = createdResidents[0]?.id ?? nextResidentId;
      residentRecordStatus = createdResidents[0]?.recordStatus ?? "PENDING";
    }

    acceptedTunggakanKeys.add(identityKey);

    const arrearsSummaryId = randomUUID();
    const arrearsSummaries = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "ArrearsSummary"
        ("id", "residentId", "totalArrearsAmount", "description", "recordStatus", "uploadedDocumentId", "createdAt", "updatedAt")
      VALUES
        (${arrearsSummaryId}::uuid, ${residentId}::uuid, ${record.jumlahTunggakan || "0"}::numeric, ${"tunggakan"}, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, NOW(), NOW())
      ON CONFLICT ("residentId") DO NOTHING
      RETURNING "id"
    `;

    const resolvedArrearsSummaryId =
      arrearsSummaries[0]?.id ??
      (await findArrearsSummaryByResidentId(tx, residentId));

    enrichedRecords.push({
      ...record,
      arrearsSummaryId: resolvedArrearsSummaryId || arrearsSummaryId,
      residentId,
      residentRecordStatus,
      importStatus: arrearsSummaries[0]?.id ? ("PENDING" as const) : ("IGNORED" as const),
      importMessage: arrearsSummaries[0]?.id
        ? undefined
        : "Rekod tunggakan sedia ada ditemui. Amaun baharu diabaikan.",
    });
  }

  const acceptedRecords = enrichedRecords.filter(
    (record) => record.importStatus !== "IGNORED",
  );
  const totalAmount = acceptedRecords
    .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
    .toFixed(2);

  return {
    ...extractResult,
    recordCount: acceptedRecords.length,
    totalAmount,
    records: enrichedRecords,
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

  const enrichedRecords = [];
  const acceptedPenghuniIcNumbers = new Set<string>();

  for (const record of extractResult.records) {
    const icNumber = record.noKadPengenalan.trim();
    const icKey = icNumber.replace(/\D/g, "");
    const existingResident = await findResidentByIcNumber(tx, icNumber);

    let residentId = existingResident?.id;
    let residentRecordStatus = existingResident?.recordStatus;

    if (acceptedPenghuniIcNumbers.has(icKey) || residentId) {
      continue;
    }

    if (!residentId) {
      const nextResidentId = randomUUID();
      const createdResidents = await tx.$queryRaw<
        { id: string; recordStatus: "PENDING" | "VERIFIED" | "REJECTED" }[]
      >`
        INSERT INTO "Resident"
          ("id", "fullName", "icNumber", "phone", "position", "department", "recordStatus", "uploadedDocumentId", "description", "createdAt", "updatedAt")
        VALUES
          (${nextResidentId}::uuid, ${record.nama}, ${icNumber}, ${record.perhubungan || null}, ${record.pekerjaan || null}, ${record.jabatan || null}, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, ${record.alamatKuarters || null}, NOW(), NOW())
        RETURNING "id", "recordStatus"
      `;
      residentId = createdResidents[0]?.id ?? nextResidentId;
      residentRecordStatus = createdResidents[0]?.recordStatus ?? "PENDING";
    }

    acceptedPenghuniIcNumbers.add(icKey);

    enrichedRecords.push({
      ...record,
      residentId,
      residentRecordStatus,
    });
  }

  return {
    ...extractResult,
    recordCount: enrichedRecords.length,
    records: enrichedRecords,
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
      "residentId" in record && typeof record.residentId === "string"
        ? record.residentId
        : "";
    const icNumber = record.noKadPengenalan.trim();
    const resolvedResidentId = await findVerifiedResidentIdForPenghuniRecord(
      tx,
      residentId,
      icNumber,
    );

    if (!resolvedResidentId) {
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
      WHERE "residentId" = ${resolvedResidentId}::uuid
        AND "status" = 'CURRENT'::"OccupancyStatus"
        AND "unitId" <> ${unitId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE "UnitOccupancy"
      SET "status" = 'PAST'::"OccupancyStatus", "moveOutDate" = COALESCE("moveOutDate", NOW()), "updatedAt" = NOW()
      WHERE "unitId" = ${unitId}::uuid
        AND "residentId" <> ${resolvedResidentId}::uuid
        AND "status" = 'CURRENT'::"OccupancyStatus"
    `;

    await tx.$executeRaw`
      INSERT INTO "UnitOccupancy"
        ("id", "residentId", "unitId", "moveInDate", "status", "description", "createdAt", "updatedAt")
      SELECT
        ${randomUUID()}::uuid,
        ${resolvedResidentId}::uuid,
        ${unitId}::uuid,
        ${parsePenghuniMoveInDate(record.tarikhMasuk ?? "")},
        'CURRENT'::"OccupancyStatus",
        ${"Dicipta selepas pengesahan dokumen penghuni."},
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM "UnitOccupancy"
        WHERE "residentId" = ${resolvedResidentId}::uuid
          AND "unitId" = ${unitId}::uuid
          AND "status" = 'CURRENT'::"OccupancyStatus"
      )
    `;
  }

  for (const unitId of touchedUnitIds) {
    await tx.$executeRaw`
      UPDATE "Unit"
      SET "status" = 'OCCUPIED'::"UnitStatus", "updatedAt" = NOW()
      WHERE "id" = ${unitId}::uuid
        AND "recordStatus" = 'VERIFIED'::"RecordStatus"
    `;
  }
}

async function findVerifiedResidentIdForPenghuniRecord(
  tx: Prisma.TransactionClient,
  residentId: string,
  icNumber: string,
) {
  if (residentId) {
    const residents = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "Resident"
      WHERE "id" = ${residentId}::uuid
        AND "recordStatus" = 'VERIFIED'::"RecordStatus"
      LIMIT 1
    `;

    if (residents[0]?.id) {
      return residents[0].id;
    }
  }

  return findVerifiedResidentIdByIcNumber(tx, icNumber);
}

async function findVerifiedResidentIdByIcNumber(
  tx: Prisma.TransactionClient,
  icNumber: string,
) {
  const residents = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') =
      regexp_replace(${icNumber}, '\\D', '', 'g')
      AND "recordStatus" = 'VERIFIED'::"RecordStatus"
    ORDER BY
      CASE WHEN "icNumber" = ${icNumber} THEN 0 ELSE 1 END,
      "createdAt" ASC
    LIMIT 1
  `;

  return residents[0]?.id ?? "";
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
      AND u."recordStatus" = 'VERIFIED'::"RecordStatus"
      AND qc."recordStatus" = 'VERIFIED'::"RecordStatus"
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

export async function createPendingKuartersRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "kuarters") {
    return extractResult;
  }

  const enrichedRecords = [];

  for (const record of extractResult.records) {
    const categoryAddress = record.kawasan || null;
    let resolvedCategoryId = await findQuarterCategoryByNameAddress(
      tx,
      record.categoryName,
      categoryAddress,
    );
    const isExistingCategory = Boolean(resolvedCategoryId);

    if (!resolvedCategoryId) {
      if (record.units.length === 0) {
        continue;
      }

      const categoryId = randomUUID();
      const createdCategories = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "QuarterCategory"
          ("id", "categoryName", "address", "rentalPrice", "maintenancePrice", "penaltyPrice", "recordStatus", "uploadedDocumentId", "createdAt", "updatedAt")
        VALUES
          (${categoryId}::uuid, ${record.categoryName}, ${categoryAddress}, ${record.rentalPrice || "0"}::numeric, ${record.maintenancePrice || "0"}::numeric, ${record.penaltyPrice || "0"}::numeric, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, NOW(), NOW())
        ON CONFLICT ("categoryName", "address") DO NOTHING
        RETURNING "id"
      `;
      resolvedCategoryId =
        createdCategories[0]?.id ??
        (await findQuarterCategoryByNameAddress(
          tx,
          record.categoryName,
          categoryAddress,
        ));
    }

    if (!resolvedCategoryId) {
      continue;
    }

    const enrichedUnits = [];

    for (const unit of record.units) {
      const existingUnitId = await findUnitByCategoryIdAndCode(
        tx,
        resolvedCategoryId,
        unit.unitCode,
      );

      if (existingUnitId) {
        continue;
      }

      const unitId = randomUUID();
      const createdUnits = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "Unit"
          ("id", "unitCode", "status", "recordStatus", "categoryId", "uploadedDocumentId", "createdAt", "updatedAt")
        VALUES
          (${unitId}::uuid, ${unit.unitCode}, 'VACANT'::"UnitStatus", 'PENDING'::"RecordStatus", ${resolvedCategoryId}::uuid, ${uploadedDocumentId}::uuid, NOW(), NOW())
        ON CONFLICT ("categoryId", "unitCode") DO NOTHING
        RETURNING "id"
      `;
      let resolvedUnitId = createdUnits[0]?.id;

      if (!resolvedUnitId) {
        resolvedUnitId = await findUnitByCategoryIdAndCode(
          tx,
          resolvedCategoryId,
          unit.unitCode,
        );
      }

      enrichedUnits.push({
        ...unit,
        unitId: resolvedUnitId ?? "",
      });
    }

    if (enrichedUnits.length === 0) {
      continue;
    }

    enrichedRecords.push({
      ...record,
      categoryId: resolvedCategoryId,
      recordStatus: isExistingCategory ? "VERIFIED" : "PENDING",
      unitCount: enrichedUnits.length,
      units: enrichedUnits,
    });
  }

  return {
    ...extractResult,
    recordCount: enrichedRecords.length,
    totalUnits: enrichedRecords.reduce(
      (total, record) => total + record.units.length,
      0,
    ),
    records: enrichedRecords,
  };
}
