import type { Prisma } from "@prisma/client";

import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { getBayaranPaymentDate } from "@/lib/uploaded-document/bayaran/documents";
import { rawData } from "@/lib/uploaded-document/shared";

export async function updateBayaranDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: Extract<ExtractResult, { documentType: "bayaran" }>,
) {
  const paymentDate = getBayaranPaymentDate(extractResult.paymentMonth);
  const nextIds = new Set<string>(
    extractResult.records
      .map((record) => record.paymentId)
      .filter((value): value is string => typeof value === "string"),
  );

  await tx.paymentDraft.deleteMany({
    where: { uploadedDocumentId, id: { notIn: [...nextIds] } },
  });

  for (const record of extractResult.records) {
    if (!record.paymentId) {
      continue;
    }

    await tx.paymentDraft.updateMany({
      where: { id: record.paymentId, uploadedDocumentId },
      data: {
        residentName: record.nama,
        residentIcNumber: record.noGajiNoKp,
        department: record.ptjpkName || record.jabatanName || null,
        paymentDate,
        receiptNo: record.noResit || null,
        referenceNo: record.noRujukan || null,
        amount: record.amaunRm || "0",
        description: record.catatan || "bayaran",
        rawData: rawData(record),
      },
    });
  }
}
