import type { Prisma } from "@prisma/client";

import type {
  ExtractedTunggakanRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  findResidentByNormalizedIc,
  rawData,
} from "@/lib/uploaded-document/shared";

function tunggakanIdentityKey(name: string, icNumber: string) {
  return [normalizeExtractText(name), icNumber.replace(/\D/g, "")].join("|");
}

function normalizeExtractText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

export async function createPendingTunggakanRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "tunggakan") {
    return extractResult;
  }

  const lastUpdatedMonth = parseTunggakanDate(extractResult.lastUpdatedMonth);
  const seen = new Set<string>();
  const records: ExtractedTunggakanRecord[] = [];

  for (const record of extractResult.records) {
    const icNumber = normalizeIc(record.noKadPengenalan);
    const jumlahTunggakan = normalizeAmount(record.jumlahTunggakan);
    const normalizedRecord: ExtractedTunggakanRecord = {
      ...record,
      noKadPengenalan: icNumber,
      jumlahTunggakan,
    };
    const identityKey = tunggakanIdentityKey(record.nama, icNumber);
    const residentId = await findResidentByNormalizedIc(tx, icNumber);
    const existingSummary = await findExistingArrearsSummary(tx, residentId);
    const hasTransactions = await residentHasTransactions(tx, residentId);
    const isDuplicateInDocument = seen.has(identityKey);
    const isExisted = Boolean(hasTransactions || isDuplicateInDocument);
    const draft = await tx.arrearsSummaryDraft.create({
      data: {
        residentName: record.nama,
        residentIcNumber: icNumber,
        totalArrearsAmount: jumlahTunggakan,
        lastUpdatedMonth,
        description: "tunggakan",
        uploadedDocumentId,
        originalResidentId: residentId || null,
        originalSummaryId: existingSummary?.id ?? null,
        isExisted,
        rawData: rawData(normalizedRecord),
      },
    });

    seen.add(identityKey);
    records.push({
      ...normalizedRecord,
      arrearsSummaryId: draft.id,
      residentId: residentId || undefined,
      isExisted,
      importStatus: isExisted ? "IGNORED" : "PENDING",
      importMessage: isExisted
        ? isDuplicateInDocument
          ? "Rekod tunggakan pendua dalam fail ini."
          : "Penghuni ini sudah mempunyai transaksi dalam sistem."
        : undefined,
    });
  }

  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    ...extractResult,
    lastUpdatedMonth: lastUpdatedMonth.toISOString(),
    recordCount: acceptedRecords.length,
    totalAmount: acceptedRecords
      .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
      .toFixed(2),
    records,
  };
}

function normalizeAmount(value: string) {
  let normalized = String(value ?? "").trim();
  if (!normalized) {
    return "0.00";
  }

  normalized = normalized.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalized);
  const hasNegativeSign = normalized.includes("-");
  const amount = Number(
    normalized
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  const signedAmount =
    (isParenthesizedNegative || hasNegativeSign) && amount > 0
      ? amount * -1
      : amount;

  return signedAmount.toFixed(2);
}

function parseTunggakanDate(value: string | undefined) {
  if (!value) {
    throw new Error("Tarikh tunggakan diperlukan sebelum dokumen disimpan.");
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tarikh tunggakan tidak sah.");
  }

  return date;
}

function normalizeIc(value: string) {
  return value.replace(/\D/g, "");
}

async function findExistingArrearsSummary(
  tx: Prisma.TransactionClient,
  residentId: string | null,
) {
  return residentId
    ? tx.arrearsSummary.findUnique({
        where: { residentId },
        select: { id: true },
      })
    : null;
}

async function residentHasTransactions(
  tx: Prisma.TransactionClient,
  residentId: string | null,
) {
  if (!residentId) {
    return false;
  }

  const transaction = await tx.transaction.findFirst({
    where: { residentId },
    select: { id: true },
  });

  return Boolean(transaction);
}
