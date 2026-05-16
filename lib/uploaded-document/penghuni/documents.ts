import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import { jsonRecord } from "@/lib/uploaded-document/shared";
import {
  findExactPenghuniMatches,
  type PenghuniExactMatchInput,
} from "@/lib/uploaded-document/penghuni/queries";

export async function buildPenghuniExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.residentDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records: PenghuniExactMatchInput[] = [];

  for (const row of rows) {
    const record = jsonRecord<ExtractedPenghuniRecord>(row.rawData, {
      residentId: row.id,
      originalResidentId: row.originalResidentId ?? undefined,
      isExisted: false,
      nama: row.fullName,
      noKadPengenalan: row.icNumber,
      kuarters: "",
      unit: "",
      alamatKuarters: row.description ?? "",
      perhubungan: row.phone ?? "",
      gmail: row.email ?? "",
      pekerjaan: row.position ?? "",
      jabatan: row.department ?? "",
      tarafPerkhidmatan: row.serviceLevel ?? "",
    });
    records.push({
      ...record,
      residentId: row.id,
      originalResidentId: row.originalResidentId ?? undefined,
    });
  }

  const exactMatches = await findExactPenghuniMatches(prisma, records);

  await Promise.all(
    rows.map((row) => {
      const exactMatch = exactMatches.get(row.id);

      if (exactMatch?.residentId === row.originalResidentId) {
        return null;
      }

      return prisma.residentDraft.update({
        where: { id: row.id },
        data: {
          originalResidentId: exactMatch?.residentId ?? null,
        },
      });
    }).filter((update) => update !== null),
  );

  return {
    documentType: "penghuni" as const,
    recordCount: records.length,
    records: records.map((record) => {
      const exactMatch = exactMatches.get(record.residentId);

      return {
        ...record,
        originalResidentId: exactMatch?.residentId ?? undefined,
        isExisted: Boolean(exactMatch),
      };
    }),
  };
}
