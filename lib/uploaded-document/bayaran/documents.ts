import type { ExtractedBayaranRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  getAppTimeZoneDateParts,
  parseDateOnlyInAppTimeZone,
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";
import { findExistingBayaranPayment } from "@/lib/uploaded-document/bayaran/queries";

export function getBayaranPaymentDate(paymentMonth: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(paymentMonth)) {
    const date = parseDateOnlyInAppTimeZone(paymentMonth.slice(0, 10));

    return date ?? new Date();
  }

  const [monthName, yearText] = paymentMonth.split(/\s+/);
  const monthIndexByName: Record<string, number> = {
    januari: 0,
    january: 0,
    februari: 1,
    february: 1,
    mac: 2,
    march: 2,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    june: 5,
    julai: 6,
    july: 6,
    ogos: 7,
    august: 7,
    september: 8,
    oktober: 9,
    october: 9,
    november: 10,
    disember: 11,
    december: 11,
  };
  const monthIndex = monthIndexByName[monthName?.toLowerCase() ?? ""] ?? 0;
  const year = Number(yearText) || getAppTimeZoneDateParts().year;

  return (
    parseDateOnlyInAppTimeZone(
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`,
    ) ?? new Date()
  );
}

export async function buildBayaranExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.paymentDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records = await Promise.all(
    rows.map(async (row) => {
      const residentId = normalizeOptionalUuid(
        await findResidentByNormalizedIc(prisma, row.residentIcNumber),
      );
      const existingPayment = await findExistingBayaranPayment(prisma, {
        residentId,
        paymentDate: row.paymentDate,
        receiptNo: row.receiptNo ?? row.referenceNo,
        amount: row.amount,
      });

      if (row.originalResidentId !== residentId) {
        await prisma.paymentDraft.update({
          where: { id: row.id },
          data: {
            originalResidentId: residentId,
          },
        });
      }

      return buildBayaranRecord(row, residentId, Boolean(existingPayment));
    }),
  );

  const totalAmount = records
    .reduce((total, record) => total + Number(record.amaunRm || 0), 0)
    .toFixed(2);

  return {
    documentType: "bayaran" as const,
    recordCount: records.length,
    totalAmount,
    paymentMonth: rows[0]?.paymentDate.toISOString() ?? "",
    records,
  };
}

type BayaranDraftRow = Awaited<
  ReturnType<typeof prisma.paymentDraft.findMany>
>[number];

function buildBayaranRecord(
  row: BayaranDraftRow,
  residentId: string | null,
  paymentExists: boolean,
) {
  return {
    paymentId: row.id,
    residentId: residentId ?? undefined,
    isExisted: paymentExists,
    page: 0,
    jabatanCode: "",
    jabatanName: row.department ?? "",
    ptjpkCode: "",
    ptjpkName: "",
    bil: "",
    noRujukan: row.receiptNo ?? row.referenceNo ?? "",
    noGajiNoKp: row.residentIcNumber,
    nama: row.residentName,
    amaunRm: row.amount.toFixed(2),
    tarikh: row.paymentDate.toISOString(),
    noResit: row.receiptNo ?? row.referenceNo ?? "",
    catatan: row.description ?? "",
  } satisfies ExtractedBayaranRecord;
}

function normalizeOptionalUuid(value: string | null | undefined) {
  return value?.trim() ? value : null;
}
