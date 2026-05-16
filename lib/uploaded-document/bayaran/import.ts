import type { Prisma } from "@prisma/client";

import type {
  ExtractedBayaranRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { getBayaranPaymentDate } from "@/lib/uploaded-document/bayaran/documents";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";

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
  const seen = new Set<string>();

  for (const record of extractResult.records) {
    const normalizedRecord = normalizeBayaranRecord(record);
    if (!/^\d{12}$/.test(normalizedRecord.noGajiNoKp)) {
      continue;
    }

    if (seen.has(normalizedRecord.noGajiNoKp)) {
      continue;
    }

    seen.add(normalizedRecord.noGajiNoKp);

    const residentId = await findResidentByNormalizedIc(
      tx,
      normalizedRecord.noGajiNoKp,
    );
    const isNewResident = !residentId;
    const draft = await tx.paymentDraft.create({
      data: {
        residentName: normalizedRecord.nama,
        residentIcNumber: normalizedRecord.noGajiNoKp,
        department: normalizedRecord.jabatanName || null,
        paymentDate,
        receiptNo: normalizedRecord.noRujukan || null,
        referenceNo: normalizedRecord.noRujukan || null,
        amount: normalizedRecord.amaunRm || "0",
        description: normalizedRecord.catatan || "bayaran",
        uploadedDocumentId,
        originalResidentId: residentId || null,
      },
    });

    records.push({
      ...normalizedRecord,
      paymentId: draft.id,
      residentId: residentId || undefined,
      isExisted: isNewResident,
    });
  }

  return {
    ...extractResult,
    recordCount: records.length,
    totalAmount: records
      .reduce((total, record) => total + Number(record.amaunRm || 0), 0)
      .toFixed(2),
    records,
  };
}

function normalizeBayaranRecord(record: ExtractedBayaranRecord): ExtractedBayaranRecord {
  return {
    ...record,
    nama: normalizeText(record.nama),
    noGajiNoKp: normalizeIc(record.noGajiNoKp),
    jabatanName: normalizeText(record.jabatanName || record.ptjpkName),
    ptjpkName: "",
    ptjpkCode: "",
    jabatanCode: "",
    noRujukan: normalizeText(record.noRujukan),
    noResit: normalizeText(record.noRujukan),
    amaunRm: normalizeAmount(record.amaunRm),
    tarikh: normalizeText(record.tarikh),
    catatan: normalizeText(record.catatan) || "bayaran",
  };
}

function normalizeText(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeIc(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeAmount(value: string) {
  const amount = Number(
    String(value ?? "")
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}
