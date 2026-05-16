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

    if (!moveInDate) {
      failedMessages.push(
        `Penghunian ${draft.fullName} gagal disahkan kerana tarikh masuk tidak sah.`,
      );
      continue;
    }

    if (moveOutDate && moveOutDate < moveInDate) {
      failedMessages.push(
        `Penghunian ${draft.fullName} gagal disahkan kerana tarikh keluar lebih awal daripada tarikh masuk.`,
      );
      continue;
    }

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
  return {
    residentId: draft.id,
    originalResidentId: draft.originalResidentId ?? undefined,
    isExisted: false,
    nama: draft.fullName,
    noKadPengenalan: draft.icNumber,
    kuarters: draft.quarterCategoryName ?? "",
    unit: draft.unitCode ?? "",
    alamatKuarters: draft.quarterAddress ?? "",
    perhubungan: draft.phone ?? "",
    gmail: draft.email ?? "",
    pekerjaan: draft.position ?? "",
    jabatan: draft.department ?? "",
    tarafPerkhidmatan: draft.serviceLevel ?? "",
    tarikhMasuk: draft.moveInDate?.toISOString() ?? "",
    tarikhKeluar: draft.moveOutDate?.toISOString() ?? "",
    catatan: draft.description ?? "",
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

  const existingOccupancy = await findPenghuniOccupancyToUpdate(
    tx,
    residentId,
    unitId,
  );

  if (existingOccupancy) {
    await tx.unitOccupancy.update({
      where: { id: existingOccupancy.id },
      data: {
        moveInDate,
        moveOutDate,
        status: moveOutDate ? "PAST" : "CURRENT",
        description: "Dikemas kini selepas pengesahan dokumen penghuni.",
      },
    });
  } else {
    await tx.unitOccupancy.create({
      data: {
        residentId,
        unitId,
        moveInDate,
        moveOutDate,
        status: moveOutDate ? "PAST" : "CURRENT",
        description: "Dicipta selepas pengesahan dokumen penghuni.",
      },
    });
  }

  await syncUnitOccupancyStatus(tx, unitId);
}

async function findPenghuniOccupancyToUpdate(
  tx: Prisma.TransactionClient,
  residentId: string,
  unitId: string,
) {
  const currentOccupancy = await tx.unitOccupancy.findFirst({
    where: { residentId, unitId, status: "CURRENT" },
    select: { id: true },
  });

  if (currentOccupancy) {
    return currentOccupancy;
  }

  return tx.unitOccupancy.findFirst({
    where: { residentId, unitId },
    orderBy: [{ moveInDate: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });
}

async function syncUnitOccupancyStatus(
  tx: Prisma.TransactionClient,
  unitId: string,
) {
  const currentOccupancy = await tx.unitOccupancy.findFirst({
    where: { unitId, status: "CURRENT" },
    select: { id: true },
  });

  await tx.unit.update({
    where: { id: unitId },
    data: { status: currentOccupancy ? "OCCUPIED" : "VACANT" },
  });
}

function parsePenghuniMoveInDate(value: string) {
  const date = parsePenghuniDateValue(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseNullablePenghuniDate(value: string) {
  if (!value) {
    return null;
  }

  const date = parsePenghuniDateValue(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePenghuniDateValue(value: string) {
  const normalizedValue = value.trim();
  const dayFirstMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  return dayFirstMatch
    ? new Date(
        `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}T00:00:00.000Z`,
      )
    : new Date(value);
}
