import type { Prisma } from "@prisma/client";

import type {
  ExtractedTunggakanRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";

type TunggakanDraftUpdateClient = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "arrearsSummary" | "arrearsSummaryDraft" | "transaction"
>;

export async function updateTunggakanDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: Extract<ExtractResult, { documentType: "tunggakan" }>,
) {
  const lastUpdatedMonth = parseNullableTunggakanDate(
    extractResult.lastUpdatedMonth,
  );
  assertNoDuplicateTunggakanRecords(extractResult.records);
  const nextIds = new Set<string>(
    extractResult.records
      .map((record) => record.arrearsSummaryId)
      .filter((value): value is string => typeof value === "string"),
  );

  await tx.arrearsSummaryDraft.deleteMany({
    where: { uploadedDocumentId, id: { notIn: [...nextIds] } },
  });

  for (const record of extractResult.records) {
    if (!record.arrearsSummaryId) {
      continue;
    }

    const normalizedRecord = normalizeTunggakanRecord(record);
    const residentId = normalizeOptionalUuid(
      await findResidentByNormalizedIc(tx, normalizedRecord.noKadPengenalan),
    );
    const existingSummary = await findExistingArrearsSummary(tx, residentId);

    await tx.arrearsSummaryDraft.updateMany({
      where: { id: record.arrearsSummaryId, uploadedDocumentId },
      data: {
        residentName: normalizedRecord.nama,
        residentIcNumber: normalizedRecord.noKadPengenalan,
        totalArrearsAmount: normalizedRecord.jumlahTunggakan || "0",
        ...(lastUpdatedMonth ? { lastUpdatedMonth } : {}),
        description: "tunggakan",
        originalResidentId: residentId,
        originalSummaryId: existingSummary?.id ?? null,
      },
    });
  }
}

export async function updateTunggakanDraft(
  tx: TunggakanDraftUpdateClient,
  uploadedDocumentId: string,
  record: ExtractedTunggakanRecord,
) {
  if (!record.arrearsSummaryId) {
    throw new Error("Rekod tunggakan tidak ditemui.");
  }

  const normalizedRecord = normalizeTunggakanRecord(record);
  if (!/^\d{12}$/.test(normalizedRecord.noKadPengenalan)) {
    throw new Error("No. Kad Pengenalan mesti mengandungi 12 digit.");
  }

  const duplicateDraft = await findDuplicateTunggakanDraft(
    tx,
    uploadedDocumentId,
    record.arrearsSummaryId,
    normalizedRecord.nama,
    normalizedRecord.noKadPengenalan,
  );

  if (duplicateDraft) {
    throw new Error(
      `Rekod tunggakan untuk ${normalizedRecord.nama} (${normalizedRecord.noKadPengenalan}) telah wujud dalam dokumen ini.`,
    );
  }

  const residentId = normalizeOptionalUuid(
    await findResidentByNormalizedIc(tx, normalizedRecord.noKadPengenalan),
  );
  const hasTransactions = await residentHasTransactions(tx, residentId);
  const existingSummary = await findExistingArrearsSummary(tx, residentId);
  const isBlocked = Boolean(hasTransactions || existingSummary);
  const importMessage = hasTransactions
    ? "Penghuni ini sudah mempunyai transaksi dalam sistem."
    : existingSummary
      ? "Rekod tunggakan telah wujud dalam sistem."
      : undefined;
  const updateResult = await tx.arrearsSummaryDraft.updateMany({
    where: { id: record.arrearsSummaryId, uploadedDocumentId },
    data: {
      residentName: normalizedRecord.nama,
      residentIcNumber: normalizedRecord.noKadPengenalan,
      totalArrearsAmount: normalizedRecord.jumlahTunggakan,
      description: "tunggakan",
      originalResidentId: residentId,
      originalSummaryId: existingSummary?.id ?? null,
    },
  });

  if (updateResult.count === 0) {
    throw new Error("Rekod tunggakan tidak ditemui dalam draf semakan.");
  }

  return {
    ...normalizedRecord,
    residentId: residentId ?? undefined,
    isExisted: isBlocked,
    importStatus: isBlocked ? "IGNORED" : "PENDING",
    importMessage,
  } satisfies ExtractedTunggakanRecord;
}

function parseNullableTunggakanDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function assertNoDuplicateTunggakanRecords(records: ExtractedTunggakanRecord[]) {
  const seen = new Set<string>();

  for (const record of records) {
    const normalizedRecord = normalizeTunggakanRecord(record);
    const key = tunggakanIdentityKey(
      normalizedRecord.nama,
      normalizedRecord.noKadPengenalan,
    );

    if (seen.has(key)) {
      throw new Error(
        `Rekod tunggakan untuk ${normalizedRecord.nama} (${normalizedRecord.noKadPengenalan}) telah wujud dalam dokumen ini.`,
      );
    }

    seen.add(key);
  }
}

function normalizeTunggakanRecord(
  record: ExtractedTunggakanRecord,
): ExtractedTunggakanRecord {
  return {
    ...record,
    nama: normalizeText(record.nama),
    noKadPengenalan: normalizeIc(record.noKadPengenalan),
    jumlahTunggakan: normalizeAmount(record.jumlahTunggakan),
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeIc(value: string) {
  return value.replace(/\D/g, "");
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

function normalizeOptionalUuid(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

function tunggakanIdentityKey(name: string, icNumber: string) {
  return [normalizeText(name).toUpperCase(), normalizeIc(icNumber)].join("|");
}

async function findDuplicateTunggakanDraft(
  tx: TunggakanDraftUpdateClient,
  uploadedDocumentId: string,
  draftId: string,
  name: string,
  icNumber: string,
) {
  const normalizedIc = normalizeIc(icNumber);
  const normalizedName = normalizeText(name).toUpperCase();

  if (!normalizedIc || !normalizedName) {
    return null;
  }

  const duplicates = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "ArrearsSummaryDraft"
    WHERE "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "id" <> ${draftId}::uuid
      AND UPPER(TRIM(regexp_replace("residentName", '\\s+', ' ', 'g'))) = ${normalizedName}
      AND regexp_replace("residentIcNumber", '\\D', '', 'g') = ${normalizedIc}
    LIMIT 1
  `;

  return duplicates[0] ?? null;
}

async function findExistingArrearsSummary(
  tx: TunggakanDraftUpdateClient,
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
  tx: TunggakanDraftUpdateClient,
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
