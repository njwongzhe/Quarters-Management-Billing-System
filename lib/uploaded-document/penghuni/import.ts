import type { Prisma } from "@prisma/client";

import type {
  ExtractedPenghuniRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  findResidentByNormalizedIc,
  rawData,
} from "@/lib/uploaded-document/shared";
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
        description: record.alamatKuarters || null,
        uploadedDocumentId,
        originalResidentId,
        rawData: rawData(record),
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
