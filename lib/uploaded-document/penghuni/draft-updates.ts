import type { Prisma } from "@prisma/client";

import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { findExactPenghuniMatch } from "@/lib/uploaded-document/penghuni/queries";

type PenghuniDraftUpdateClient = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "residentDraft"
>;

export async function updatePenghuniDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  records: ExtractedPenghuniRecord[],
) {
  const nextIds = new Set<string>(
    records
      .map((record) => record.residentId)
      .filter((value): value is string => typeof value === "string"),
  );

  await tx.residentDraft.deleteMany({
    where: { uploadedDocumentId, id: { notIn: [...nextIds] } },
  });

  for (const record of records) {
    if (!record.residentId) {
      continue;
    }

    const exactMatch = await findExactPenghuniMatch(tx, record);

    await tx.residentDraft.updateMany({
      where: { id: record.residentId, uploadedDocumentId },
      data: {
        fullName: record.nama,
        icNumber: record.noKadPengenalan,
        phone: record.perhubungan || null,
        email: record.gmail || null,
        position: record.pekerjaan || null,
        department: record.jabatan || null,
        serviceLevel: record.tarafPerkhidmatan || null,
        description: record.catatan || null,
        quarterCategoryName: record.kuarters || null,
        quarterAddress: record.alamatKuarters || null,
        unitCode: record.unit || null,
        moveInDate: parseNullableDate(record.tarikhMasuk),
        moveOutDate: parseNullableDate(record.tarikhKeluar),
        originalResidentId: exactMatch?.residentId ?? null,
      },
    });
  }
}

export async function updatePenghuniDraft(
  tx: PenghuniDraftUpdateClient,
  uploadedDocumentId: string,
  record: ExtractedPenghuniRecord,
) {
  if (!record.residentId) {
    throw new Error("Rekod penghuni tidak ditemui.");
  }

  const duplicateDraft = await findDuplicatePenghuniDraftByIc(
    tx,
    uploadedDocumentId,
    record.residentId,
    record.noKadPengenalan,
  );

  if (duplicateDraft) {
    throw new Error(
      `No. K/P ${record.noKadPengenalan} telah wujud dalam dokumen ini.`,
    );
  }

  const exactMatch = await findExactPenghuniMatch(tx, record);
  const updateResult = await tx.residentDraft.updateMany({
    where: { id: record.residentId, uploadedDocumentId },
    data: {
      fullName: record.nama,
      icNumber: record.noKadPengenalan,
      phone: record.perhubungan || null,
      email: record.gmail || null,
      position: record.pekerjaan || null,
      department: record.jabatan || null,
      serviceLevel: record.tarafPerkhidmatan || null,
      description: record.catatan || null,
      quarterCategoryName: record.kuarters || null,
      quarterAddress: record.alamatKuarters || null,
      unitCode: record.unit || null,
      moveInDate: parseNullableDate(record.tarikhMasuk),
      moveOutDate: parseNullableDate(record.tarikhKeluar),
      originalResidentId: exactMatch?.residentId ?? null,
    },
  });

  if (updateResult.count === 0) {
    throw new Error("Rekod penghuni tidak ditemui dalam draf semakan.");
  }

  return {
    ...record,
    originalResidentId: exactMatch?.residentId ?? undefined,
    isExisted: Boolean(exactMatch),
  };
}

export async function deletePenghuniDraft(
  tx: Pick<Prisma.TransactionClient, "residentDraft">,
  uploadedDocumentId: string,
  residentDraftId: string,
) {
  if (!residentDraftId) {
    throw new Error("Rekod penghuni tidak ditemui.");
  }

  const deleteResult = await tx.residentDraft.deleteMany({
    where: { id: residentDraftId, uploadedDocumentId },
  });

  if (deleteResult.count === 0) {
    throw new Error("Rekod penghuni tidak ditemui dalam draf semakan.");
  }
}

async function findDuplicatePenghuniDraftByIc(
  tx: PenghuniDraftUpdateClient,
  uploadedDocumentId: string,
  draftId: string,
  icNumber: string,
) {
  const normalizedIc = icNumber.replace(/\D/g, "");

  if (!normalizedIc) {
    return null;
  }

  const duplicates = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "ResidentDraft"
    WHERE "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "id" <> ${draftId}::uuid
      AND regexp_replace("icNumber", '\\D', '', 'g') = ${normalizedIc}
    LIMIT 1
  `;

  return duplicates[0] ?? null;
}

function parseNullableDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  const dayFirstMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const date = dayFirstMatch
    ? new Date(
        `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}T00:00:00.000Z`,
      )
    : new Date(`${normalizedValue.slice(0, 10)}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}
