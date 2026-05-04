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
    const resident = await tx.resident.findUnique({
      where: {
        icNumber,
      },
    });
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
    const existingResident = await tx.resident.findUnique({
      where: {
        icNumber,
      },
      select: {
        id: true,
        recordStatus: true,
      },
    });

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
