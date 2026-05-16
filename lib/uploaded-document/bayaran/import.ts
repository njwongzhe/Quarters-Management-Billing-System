import type { Prisma } from "@prisma/client";

import type {
  ExtractedBayaranRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { getBayaranPaymentDate } from "@/lib/uploaded-document/bayaran/documents";
import {
  findResidentByNormalizedIc,
  rawData,
} from "@/lib/uploaded-document/shared";

export async function createPendingBayaranRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "bayaran") {
    return extractResult;
  }

  const paymentDate = getBayaranPaymentDate(extractResult.paymentMonth);
  const records: ExtractedBayaranRecord[] = [];

  for (const record of extractResult.records) {
    const residentId = await findResidentByNormalizedIc(tx, record.noGajiNoKp);
    const existingPayment = await tx.payment.findFirst({
      where: {
        residentId: residentId || undefined,
        receiptNo: record.noRujukan || record.noResit || undefined,
        paymentDate,
      },
      select: { id: true },
    });
    const draft = await tx.paymentDraft.create({
      data: {
        residentName: record.nama,
        residentIcNumber: record.noGajiNoKp.trim(),
        department: record.ptjpkName || record.jabatanName || null,
        paymentDate,
        receiptNo: record.noResit || null,
        referenceNo: record.noRujukan || null,
        amount: record.amaunRm || "0",
        description: record.catatan || "bayaran",
        uploadedDocumentId,
        originalResidentId: residentId || null,
        originalPaymentId: existingPayment?.id ?? null,
        isExisted: Boolean(existingPayment?.id),
        rawData: rawData(record),
      },
    });

    records.push({
      ...record,
      paymentId: draft.id,
      residentId: residentId || undefined,
      isExisted: draft.isExisted,
    });
  }

  return { ...extractResult, recordCount: records.length, records };
}
