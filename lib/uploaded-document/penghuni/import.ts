import type { Prisma } from "@prisma/client";

import type {
  ExtractedPenghuniRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { parseFlexibleDateOnlyInAppTimeZone } from "@/lib/date-time";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";
import { findExactPenghuniMatch } from "@/lib/uploaded-document/penghuni/queries";

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
    const exactMatch = await findExactPenghuniMatch(tx, record);
    const originalResidentId = exactMatch?.residentId || residentId || null;
    const draft = await tx.residentDraft.create({
      data: {
        fullName: record.nama,
        icNumber: record.noKadPengenalan.trim(),
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
        uploadedDocumentId,
        originalResidentId,
      },
    });

    records.push({
      ...record,
      residentId: draft.id,
      originalResidentId: originalResidentId ?? undefined,
      isExisted: Boolean(exactMatch),
    });
  }

  return { ...extractResult, recordCount: records.length, records };
}

function parseNullableDate(value: string | undefined) {
  return parseFlexibleDateOnlyInAppTimeZone(value);
}
