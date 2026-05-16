import type { Prisma } from "@prisma/client";

import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import type { VerifyResult } from "@/lib/uploaded-document/verification";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";
import {
  findUnitIdForPenghuniRecord,
  hasOccupancyConflict,
} from "@/lib/uploaded-document/penghuni/queries";
import {
  findQuarterCategoryByNameAddress,
  findUnitByCategoryIdAndCode,
} from "@/lib/uploaded-document/kuarters/queries";

export async function verifyPenghuniDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const selectedKeySet = new Set(
    selectedKeys.flatMap((key) => [normalizeSelectedKey(key), normalizeIc(key)]),
  );
  const drafts = await tx.residentDraft.findMany({
    where: { uploadedDocumentId },
  });
  const selectedDrafts = drafts.filter((draft) => {
    const draftKeys = [
      normalizeSelectedKey(draft.id),
      normalizeSelectedKey(draft.icNumber),
      normalizeIc(draft.icNumber),
    ];

    return draftKeys.some((key) => selectedKeySet.has(key));
  });
  const failedMessages: string[] = [];
  const successMessages: string[] = [];
  let createdResidents = 0;
  let updatedResidents = 0;
  let verifiedRows = 0;

  if (selectedDrafts.length === 0) {
    return {
      verifiedRows: 0,
      failedMessages: [
        "Rekod dipilih tidak ditemui dalam draf semakan. Sila muat semula halaman dan cuba lagi.",
      ],
    };
  }

  for (const draft of selectedDrafts) {
    const record = buildRecordFromDraft(draft);
    let residentId = await findResidentByNormalizedIc(tx, draft.icNumber);
    const unitResult = await resolvePenghuniUnit(
      tx,
      uploadedDocumentId,
      record,
      draft.fullName,
    );

    if (unitResult.failedMessage) {
      failedMessages.push(unitResult.failedMessage);
      continue;
    }

    successMessages.push(...unitResult.successMessages);

    const unitId = unitResult.unitId;
    if (unitId && !normalizePenghuniText(record.tarikhMasuk)) {
      failedMessages.push(
        `Penghunian ${draft.fullName} gagal disahkan kerana tarikh masuk belum diisi.`,
      );
      continue;
    }

    const moveInDate = parsePenghuniMoveInDate(record.tarikhMasuk ?? "");
    const moveOutDate = parseNullablePenghuniDate(record.tarikhKeluar ?? "");

    if (unitId) {
      const conflict = await hasOccupancyConflict(
        tx,
        unitId,
        residentId,
        moveInDate,
        moveOutDate,
      );

      if (conflict) {
        failedMessages.push(
          `Penghunian ${draft.fullName} gagal disahkan kerana unit ${record.unit} telah diduduki dalam tempoh tersebut.`,
        );
        continue;
      }
    }

    if (residentId) {
      await tx.resident.update({
        where: { id: residentId },
        data: {
          fullName: draft.fullName,
          icNumber: draft.icNumber,
          phone: draft.phone,
          email: draft.email,
          position: draft.position,
          department: draft.department,
          serviceLevel: draft.serviceLevel,
          status: draft.status,
          description: draft.description,
          uploadedDocumentId,
        },
      });
      updatedResidents += 1;
    } else {
      const resident = await tx.resident.create({
        data: {
          fullName: draft.fullName,
          icNumber: draft.icNumber,
          phone: draft.phone,
          email: draft.email,
          position: draft.position,
          department: draft.department,
          serviceLevel: draft.serviceLevel,
          status: draft.status,
          description: draft.description,
          uploadedDocumentId,
        },
        select: { id: true },
      });
      residentId = resident.id;
      createdResidents += 1;
    }

    if (unitId) {
      await upsertPenghuniOccupancy(
        tx,
        residentId,
        unitId,
        moveInDate,
        moveOutDate,
      );
    }

    await tx.residentDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  const summaryMessages = [
    createdResidents > 0 ? `${createdResidents} penghuni baharu ditambah.` : "",
    updatedResidents > 0
      ? `${updatedResidents} rekod penghuni sedia ada dikemas kini.`
      : "",
  ].filter(Boolean);

  return {
    verifiedRows,
    failedMessages,
    successMessages: [...summaryMessages, ...successMessages],
  };
}

function buildRecordFromDraft(
  draft: Prisma.ResidentDraftGetPayload<Record<string, never>>,
): ExtractedPenghuniRecord {
  const rawRecord =
    draft.rawData && typeof draft.rawData === "object" && !Array.isArray(draft.rawData)
      ? draft.rawData
      : {};

  return {
    ...rawRecord,
    residentId: draft.id,
    originalResidentId: draft.originalResidentId ?? undefined,
    isExisted: false,
    nama: draft.fullName,
    noKadPengenalan: draft.icNumber,
    kuarters: "kuarters" in rawRecord ? String(rawRecord.kuarters) : "",
    unit: "unit" in rawRecord ? String(rawRecord.unit) : "",
    alamatKuarters: draft.description ?? "",
    perhubungan: draft.phone ?? "",
    gmail: draft.email ?? "",
    pekerjaan: draft.position ?? "",
    jabatan: draft.department ?? "",
    tarafPerkhidmatan: draft.serviceLevel ?? "",
    tarikhMasuk: "tarikhMasuk" in rawRecord ? String(rawRecord.tarikhMasuk) : "",
    tarikhKeluar: "tarikhKeluar" in rawRecord ? String(rawRecord.tarikhKeluar) : "",
  };
}

type UnitResolutionResult = {
  unitId: string;
  failedMessage?: string;
  successMessages: string[];
};

async function resolvePenghuniUnit(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  record: ExtractedPenghuniRecord,
  residentName: string,
): Promise<UnitResolutionResult> {
  const existingUnitId = await findUnitIdForPenghuniRecord(tx, record);

  if (existingUnitId) {
    return { unitId: existingUnitId, successMessages: [] };
  }

  const categoryName = normalizePenghuniText(record.kuarters);
  const address = normalizePenghuniText(record.alamatKuarters);
  const unitCode = normalizePenghuniText(record.unit);
  const hasAnyQuarterInfo = Boolean(categoryName || address || unitCode);

  if (!hasAnyQuarterInfo) {
    return { unitId: "", successMessages: [] };
  }

  if (!categoryName || !address || !unitCode) {
    return {
      unitId: "",
      failedMessage: `Penghuni ${residentName} gagal disahkan kerana maklumat kuarters tidak lengkap.`,
      successMessages: [],
    };
  }

  const successMessages: string[] = [];
  let categoryId = await findQuarterCategoryByNameAddress(tx, categoryName, address);

  if (!categoryId) {
    const category = await tx.quarterCategory.create({
      data: {
        categoryName,
        address,
        rentalPrice: 0,
        maintenancePrice: 0,
        penaltyPrice: 0,
        uploadedDocumentId,
      },
      select: { id: true },
    });
    categoryId = category.id;
    successMessages.push(`Kategori kuarters ${categoryName} ditambah secara automatik.`);
  }

  let unitId = await findUnitByCategoryIdAndCode(tx, categoryId, unitCode);

  if (!unitId) {
    const unit = await tx.unit.create({
      data: {
        unitCode,
        status: "VACANT",
        categoryId,
        uploadedDocumentId,
      },
      select: { id: true },
    });
    unitId = unit.id;
    successMessages.push(`Unit ${unitCode} ditambah secara automatik.`);
  }

  return { unitId, successMessages };
}

function normalizePenghuniText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeSelectedKey(value: string) {
  return value.trim();
}

function normalizeIc(value: string) {
  return value.replace(/\D/g, "");
}

async function upsertPenghuniOccupancy(
  tx: Prisma.TransactionClient,
  residentId: string,
  unitId: string,
  moveInDate: Date,
  moveOutDate: Date | null,
) {
  await tx.$executeRaw`
    UPDATE "UnitOccupancy"
    SET "status" = 'PAST'::"OccupancyStatus", "moveOutDate" = COALESCE("moveOutDate", ${moveInDate}), "updatedAt" = NOW()
    WHERE "residentId" = ${residentId}::uuid
      AND "status" = 'CURRENT'::"OccupancyStatus"
      AND "unitId" <> ${unitId}::uuid
  `;

  await tx.$executeRaw`
    INSERT INTO "UnitOccupancy"
      ("id", "residentId", "unitId", "moveInDate", "moveOutDate", "status", "description", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid(),
      ${residentId}::uuid,
      ${unitId}::uuid,
      ${moveInDate},
      ${moveOutDate},
      ${moveOutDate ? "PAST" : "CURRENT"}::"OccupancyStatus",
      ${"Dicipta selepas pengesahan dokumen penghuni."},
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM "UnitOccupancy"
      WHERE "residentId" = ${residentId}::uuid
        AND "unitId" = ${unitId}::uuid
        AND "moveInDate" = ${moveInDate}
        AND COALESCE("moveOutDate", 'infinity'::timestamp) = COALESCE(${moveOutDate}, 'infinity'::timestamp)
    )
  `;

  await tx.unit.update({
    where: { id: unitId },
    data: { status: moveOutDate ? "VACANT" : "OCCUPIED" },
  });
}

function parsePenghuniMoveInDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function parseNullablePenghuniDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
