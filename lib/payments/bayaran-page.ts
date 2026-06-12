import {
  buildStats,
  mapPaymentExportRow,
  mapPaymentRow,
} from "@/lib/payments/bayaran-helpers";
import { getBayaranPaymentListData } from "@/lib/payments/bayaran-list-queries";
import type {
  BayaranExportRow,
  BayaranRow,
  BayaranStatCard,
} from "@/lib/payments/bayaran-types";

export type BayaranPageData = {
  rows: BayaranRow[];
  exportRows: BayaranExportRow[];
  stats: BayaranStatCard[];
};

export async function getBayaranPageData(
  paymentMonth = new Date(),
): Promise<BayaranPageData> {
  const { rows: payments, paymentStats } =
    await getBayaranPaymentListData(paymentMonth);

  return {
    rows: payments.map(mapPaymentRow),
    exportRows: payments.map(mapPaymentExportRow),
    stats: buildStats(paymentStats),
  };
}

export function parseBayaranPaymentMonth(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return new Date();
  }

  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1, 1);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    Number.isNaN(date.getTime())
  ) {
    return new Date();
  }

  return date;
}
