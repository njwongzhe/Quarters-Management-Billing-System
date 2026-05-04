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

  for (const record of extractResult.records) {
    const icNumber = record.noKadPengenalan.trim();
    const existingResident = await findResidentByIcNumber(tx, icNumber);

    let residentId = existingResident?.id;
    let residentRecordStatus = existingResident?.recordStatus;

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

    const arrearsSummaryId = randomUUID();
    const arrearsSummaries = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "ArrearsSummary"
        ("id", "residentId", "totalArrearsAmount", "description", "recordStatus", "uploadedDocumentId", "createdAt", "updatedAt")
      VALUES
        (${arrearsSummaryId}::uuid, ${residentId}::uuid, ${record.jumlahTunggakan || "0"}::numeric, ${"tunggakan"}, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, NOW(), NOW())
      ON CONFLICT ("residentId") DO UPDATE
      SET
        "totalArrearsAmount" = EXCLUDED."totalArrearsAmount",
        "description" = EXCLUDED."description",
        "recordStatus" = 'PENDING'::"RecordStatus",
        "uploadedDocumentId" = EXCLUDED."uploadedDocumentId",
        "updatedAt" = NOW()
      RETURNING "id"
    `;

    enrichedRecords.push({
      ...record,
      arrearsSummaryId: arrearsSummaries[0]?.id ?? arrearsSummaryId,
      residentId,
      residentRecordStatus,
    });
  }

  return {
    ...extractResult,
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

  for (const record of extractResult.records) {
    const icNumber = record.noKadPengenalan.trim();
    const existingResident = await findResidentByIcNumber(tx, icNumber);

    let residentId = existingResident?.id;
    let residentRecordStatus = existingResident?.recordStatus;

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

    const unitId = await findUnitIdForPenghuniRecord(tx, record.kuarters, record.unit);

    if (unitId) {
      await tx.$executeRaw`
        UPDATE "UnitOccupancy"
        SET "status" = 'PAST'::"OccupancyStatus", "moveOutDate" = COALESCE("moveOutDate", NOW()), "updatedAt" = NOW()
        WHERE "residentId" = ${residentId}::uuid
          AND "status" = 'CURRENT'::"OccupancyStatus"
          AND "unitId" <> ${unitId}::uuid
      `;

      await tx.$executeRaw`
        INSERT INTO "UnitOccupancy"
          ("id", "residentId", "unitId", "moveInDate", "status", "description", "createdAt", "updatedAt")
        SELECT
          ${randomUUID()}::uuid,
          ${residentId}::uuid,
          ${unitId}::uuid,
          ${parsePenghuniMoveInDate(record.tarikhMasuk ?? "")},
          'CURRENT'::"OccupancyStatus",
          ${"Dicipta daripada dokumen penghuni."},
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

      await tx.$executeRaw`
        UPDATE "Unit"
        SET "status" = 'OCCUPIED'::"UnitStatus", "updatedAt" = NOW()
        WHERE "id" = ${unitId}::uuid
      `;
    }

    enrichedRecords.push({
      ...record,
      residentId,
      residentRecordStatus,
    });
  }

  return {
    ...extractResult,
    records: enrichedRecords,
  };
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
    const categoryId = randomUUID();
    const createdCategories = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "QuarterCategory"
        ("id", "categoryName", "address", "rentalPrice", "maintenancePrice", "penaltyPrice", "recordStatus", "uploadedDocumentId", "createdAt", "updatedAt")
      VALUES
        (${categoryId}::uuid, ${record.categoryName}, ${record.kawasan || null}, ${record.rentalPrice || "0"}::numeric, ${record.maintenancePrice || "0"}::numeric, ${record.penaltyPrice || "0"}::numeric, 'PENDING'::"RecordStatus", ${uploadedDocumentId}::uuid, NOW(), NOW())
      ON CONFLICT ("categoryName", "address") DO NOTHING
      RETURNING "id"
    `;
    const resolvedCategoryId = createdCategories[0]?.id;

    if (!resolvedCategoryId) {
      enrichedRecords.push(record);
      continue;
    }

    const enrichedUnits = [];

    for (const unit of record.units) {
      const unitId = randomUUID();
      const createdUnits = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "Unit"
          ("id", "unitCode", "status", "recordStatus", "categoryId", "uploadedDocumentId", "createdAt", "updatedAt")
        VALUES
          (${unitId}::uuid, ${unit.unitCode}, 'VACANT'::"UnitStatus", 'PENDING'::"RecordStatus", ${resolvedCategoryId}::uuid, ${uploadedDocumentId}::uuid, NOW(), NOW())
        ON CONFLICT ("categoryId", "unitCode") DO NOTHING
        RETURNING "id"
      `;

      enrichedUnits.push({
        ...unit,
        unitId: createdUnits[0]?.id ?? "",
      });
    }

    enrichedRecords.push({
      ...record,
      categoryId: resolvedCategoryId,
      units: enrichedUnits,
    });
  }

  return {
    ...extractResult,
    records: enrichedRecords,
  };
}
