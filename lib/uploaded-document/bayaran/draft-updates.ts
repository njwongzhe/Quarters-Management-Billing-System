import type { Prisma } from "@prisma/client";

import type {
  ExtractedBayaranRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { parseDateOnlyInAppTimeZone } from "@/lib/date-time";
import { getBayaranPaymentDate } from "@/lib/uploaded-document/bayaran/documents";
import { findExistingBayaranPayment } from "@/lib/uploaded-document/bayaran/queries";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";

type BayaranDraftUpdateClient = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "payment" | "paymentDraft"
>;

export async function updateBayaranDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: Extract<ExtractResult, { documentType: "bayaran" }>,
) {
  const paymentDate = getBayaranPaymentDate(extractResult.paymentMonth);
  assertNoDuplicateBayaranRecords(extractResult.records);
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

    const normalizedRecord = normalizeBayaranRecord(record);
    const residentId = normalizeOptionalUuid(
      await findResidentByNormalizedIc(tx, normalizedRecord.noGajiNoKp),
    );

    await tx.paymentDraft.updateMany({
      where: { id: record.paymentId, uploadedDocumentId },
      data: {
        residentName: normalizedRecord.nama,
        residentIcNumber: normalizedRecord.noGajiNoKp,
        department: normalizedRecord.jabatanName || null,
        paymentDate,
        receiptNo: normalizedRecord.noRujukan || null,
        referenceNo: normalizedRecord.noRujukan || null,
        amount: normalizedRecord.amaunRm || "0",
        description: normalizedRecord.catatan || "bayaran",
        originalResidentId: residentId,
      },
    });
  }
}

export async function updateBayaranDraft(
  tx: BayaranDraftUpdateClient,
  uploadedDocumentId: string,
  record: ExtractedBayaranRecord,
) {
  if (!record.paymentId) {
    throw new Error("Rekod bayaran tidak ditemui.");
  }

  const normalizedRecord = normalizeBayaranRecord(record);
  if (!/^\d{12}$/.test(normalizedRecord.noGajiNoKp)) {
    throw new Error("No. Kad Pengenalan mesti mengandungi 12 digit.");
  }

  const duplicateDraft = await findDuplicateBayaranDraft(
    tx,
    uploadedDocumentId,
    record.paymentId,
    normalizedRecord.noGajiNoKp,
  );

  if (duplicateDraft) {
    throw new Error(
      `No. Kad Pengenalan ${normalizedRecord.noGajiNoKp} telah wujud dalam dokumen ini.`,
    );
  }

  const residentId = normalizeOptionalUuid(
    await findResidentByNormalizedIc(tx, normalizedRecord.noGajiNoKp),
  );
  const paymentDate = parsePaymentDate(normalizedRecord.tarikh);
  const existingPayment = await findExistingBayaranPayment(tx, {
    residentId,
    paymentDate,
    receiptNo: normalizedRecord.noRujukan,
    amount: normalizedRecord.amaunRm,
  });
  const updateResult = await tx.paymentDraft.updateMany({
    where: { id: record.paymentId, uploadedDocumentId },
    data: {
      residentName: normalizedRecord.nama,
      residentIcNumber: normalizedRecord.noGajiNoKp,
      department: normalizedRecord.jabatanName || null,
      paymentDate,
      receiptNo: normalizedRecord.noRujukan || null,
      referenceNo: normalizedRecord.noRujukan || null,
      amount: normalizedRecord.amaunRm,
      description: normalizedRecord.catatan || "bayaran",
      originalResidentId: residentId,
    },
  });

  if (updateResult.count === 0) {
    throw new Error("Rekod bayaran tidak ditemui dalam draf semakan.");
  }

  return {
    ...normalizedRecord,
    residentId: residentId ?? undefined,
    isExisted: Boolean(existingPayment),
    tarikh: paymentDate.toISOString(),
  } satisfies ExtractedBayaranRecord;
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

function assertNoDuplicateBayaranRecords(records: ExtractedBayaranRecord[]) {
  const seen = new Set<string>();

  for (const record of records) {
    const icNumber = normalizeIc(record.noGajiNoKp);

    if (!icNumber) {
      continue;
    }

    if (seen.has(icNumber)) {
      throw new Error(`No. Kad Pengenalan ${icNumber} telah wujud dalam dokumen ini.`);
    }

    seen.add(icNumber);
  }
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

function parsePaymentDate(value: string) {
  const normalized = normalizeText(value);
  const date = /^\d{4}-\d{2}-\d{2}/.test(normalized)
    ? parseDateOnlyInAppTimeZone(normalized.slice(0, 10))
    : getBayaranPaymentDate(normalized);

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error("Tarikh bayaran tidak sah.");
  }

  return date;
}

function normalizeOptionalUuid(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

async function findDuplicateBayaranDraft(
  tx: BayaranDraftUpdateClient,
  uploadedDocumentId: string,
  draftId: string,
  icNumber: string,
) {
  const normalizedIc = normalizeIc(icNumber);

  if (!normalizedIc) {
    return null;
  }

  const duplicates = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "PaymentDraft"
    WHERE "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "id" <> ${draftId}::uuid
      AND regexp_replace("residentIcNumber", '\\D', '', 'g') = ${normalizedIc}
    LIMIT 1
  `;

  return duplicates[0] ?? null;
}
