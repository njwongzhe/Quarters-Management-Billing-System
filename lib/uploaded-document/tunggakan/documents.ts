import type { ExtractedTunggakanRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";

export async function buildTunggakanExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records = await Promise.all(
    rows.map(async (row) => {
      const residentId = normalizeOptionalUuid(
        row.originalResidentId ??
          (await findResidentByNormalizedIc(prisma, row.residentIcNumber)),
      );
      const hasTransactions = await residentHasTransactions(residentId);
      const existingSummary = await findExistingArrearsSummary(residentId);
      const isBlocked = Boolean(hasTransactions || existingSummary);
      const importMessage = hasTransactions
        ? "Penghuni ini sudah mempunyai transaksi dalam sistem."
        : existingSummary
          ? "Rekod tunggakan telah wujud dalam sistem."
          : undefined;

      if (
        row.originalResidentId !== residentId ||
        row.originalSummaryId !== (existingSummary?.id ?? null)
      ) {
        await prisma.arrearsSummaryDraft.update({
          where: { id: row.id },
          data: {
            originalResidentId: residentId,
            originalSummaryId: existingSummary?.id ?? null,
          },
        });
      }

      const record = buildTunggakanRecord(
        row,
        residentId,
        isBlocked,
        importMessage,
      );

      return record;
    }),
  );
  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    documentType: "tunggakan" as const,
    recordCount: acceptedRecords.length,
    lastUpdatedMonth: rows[0]?.lastUpdatedMonth?.toISOString(),
    totalAmount: sumSignedTunggakanAmounts(acceptedRecords),
    records,
  };
}

type TunggakanDraftRow = Awaited<
  ReturnType<typeof prisma.arrearsSummaryDraft.findMany>
>[number];

function buildTunggakanRecord(
  row: TunggakanDraftRow,
  residentId: string | null,
  isBlocked: boolean,
  importMessage?: string,
) {
  return {
    arrearsSummaryId: row.id,
    residentId: residentId ?? undefined,
    isExisted: isBlocked,
    importStatus: isBlocked ? "IGNORED" : "PENDING",
    importMessage,
    nama: row.residentName,
    noKadPengenalan: row.residentIcNumber,
    jumlahTunggakan: formatSignedDecimal(row.totalArrearsAmount),
  } satisfies ExtractedTunggakanRecord;
}

async function residentHasTransactions(residentId: string | null) {
  if (!residentId) {
    return false;
  }

  const transaction = await prisma.transaction.findFirst({
    where: { residentId },
    select: { id: true },
  });

  return Boolean(transaction);
}

async function findExistingArrearsSummary(residentId: string | null) {
  return residentId
    ? prisma.arrearsSummary.findUnique({
        where: { residentId },
        select: { id: true },
      })
    : null;
}

function normalizeOptionalUuid(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

function formatSignedDecimal(value: { toString: () => string }) {
  const amount = Number(value.toString());

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function sumSignedTunggakanAmounts(records: ExtractedTunggakanRecord[]) {
  return records
    .reduce((total, record) => total + parseSignedAmount(record.jumlahTunggakan), 0)
    .toFixed(2);
}

function parseSignedAmount(value: string) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return 0;
  }

  const normalizedSign = normalizedValue.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalizedSign);
  const hasNegativeSign = normalizedSign.includes("-");
  const numericValue = Number(
    normalizedSign
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return (isParenthesizedNegative || hasNegativeSign) && numericValue > 0
    ? numericValue * -1
    : numericValue;
}
