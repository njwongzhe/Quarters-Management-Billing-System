import {
  bayaranStatTemplates,
  bayaranStatusFilters,
} from "./bayaran-constants";
import type {
  BayaranExportRow,
  BayaranFilters,
  BayaranPaginationItem,
  BayaranRow,
  BayaranStatusFilter,
  PaymentQueryRow,
  PaymentStatsQueryRow,
  PaymentStatus,
} from "./bayaran-types";

// Helper functions for the Bayaran module
export function createDefaultBayaranFilters(): BayaranFilters {
  return {
    query: "",
    statuses: bayaranStatusFilters.map((status) => status.value),
    statusMode: false,
  };
}

export function getVisiblePages(
  currentPage: number,
  totalPages: number,
): BayaranPaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

export function buildStats(stats: PaymentStatsQueryRow) {
  const values = [
    stats.total,
    stats.cukup,
    stats.kurang,
    stats.lebih,
    stats.tidakLengkap,
  ];

  return bayaranStatTemplates.map((stat, index) => ({
    ...stat,
    value: Number(values[index]).toLocaleString("ms-MY"),
  }));
}

export function mapPaymentRow(payment: PaymentQueryRow): BayaranRow {
  const paymentAmount = normalizeAmount(payment.amount);
  const arrearsAmount = normalizeNullableAmount(payment.totalArrearsAmount) ?? 0;
  const isDataTidakLengkap = isDataTidakLengkapResident(payment.residentStatus);
  const unitCode = payment.unitCode ?? payment.extractedUnit;
  const address = payment.categoryAddress;
  const name = payment.fullName ?? payment.extractedName ?? "N/A";
  const ic = payment.icNumber ?? payment.extractedIcNumber ?? "N/A";
  const quarters = payment.categoryName ?? payment.extractedKuarters ?? "N/A";
  const unit =
    unitCode && address
      ? `${unitCode}, ${address}`
      : unitCode ?? address ?? "N/A";
  const paymentStatus = getPaymentStatusFilter(
    arrearsAmount,
    isDataTidakLengkap,
  );

  return {
    id: payment.id,
    residentId: payment.residentId,
    name,
    ic,
    quarters,
    unit,
    arrears: formatMoney(arrearsAmount),
    amount: formatMoney(paymentAmount),
    tone: getPaymentTone(arrearsAmount, isDataTidakLengkap),
    paymentStatus,
    searchText: buildSearchText([name, ic, quarters, unit]),
  };
}

export function mapPaymentExportRow(
  payment: PaymentQueryRow,
): BayaranExportRow {
  const arrearsAmount = normalizeNullableAmount(payment.totalArrearsAmount) ?? 0;
  const isDataTidakLengkap = isDataTidakLengkapResident(payment.residentStatus);
  const amount = normalizeAmount(payment.amount);
  const name = payment.fullName ?? payment.extractedName ?? "N/A";
  const ic = payment.icNumber ?? payment.extractedIcNumber ?? "N/A";
  const quarters = payment.categoryName ?? payment.extractedKuarters ?? "N/A";
  const unit =
    payment.unitCode && payment.categoryAddress
      ? `${payment.unitCode}, ${payment.categoryAddress}`
      : payment.unitCode ?? payment.extractedUnit ?? payment.categoryAddress ?? "N/A";
  const status = getPaymentStatusLabel(arrearsAmount, isDataTidakLengkap);
  const paymentStatus = getPaymentStatusFilter(
    arrearsAmount,
    isDataTidakLengkap,
  );

  return {
    name,
    ic,
    quarters,
    unit,
    arrearsAmount,
    amount,
    status,
    paymentStatus,
    searchText: buildSearchText([name, ic, quarters, unit, status]),
  };
}

import { searchRecords } from "@/app/components/SearchBar";

export function filterBayaranRecords<
  T extends {
    name: string;
    ic: string;
    quarters: string;
    unit: string;
    paymentStatus: BayaranStatusFilter;
  },
>(records: T[], filters: BayaranFilters) {
  const searched = searchRecords(
    records,
    filters.query,
    (row) => [
      row.name,
      row.ic,
      row.quarters,
      row.unit,
      "status" in row ? (row as any).status as string : null,
    ],
    { icSearch: true },
  );

  return searched.filter((row) => filters.statuses.includes(row.paymentStatus));
}

export function rowBorder(tone: string) {
  if (tone === "green") return "border-l-4 border-l-cukup";
  if (tone === "red") return "border-l-4 border-l-kurang";
  if (tone === "blue") return "border-l-4 border-l-lebih";
  return "border-l-4 border-l-x-lengkap";
}

export function rowText(tone: string) {
  if (tone === "green") return "text-cukup";
  if (tone === "red") return "text-kurang";
  if (tone === "blue") return "text-lebih";
  return "text-x-lengkap";
}

function getPaymentTone(
  arrearsAmount: number | null,
  isDataTidakLengkap: boolean,
): PaymentStatus {
  if (isDataTidakLengkap) {
    return "purple";
  }

  const currentArrears = arrearsAmount ?? 0;

  if (currentArrears < 0) {
    return "blue";
  }

  if (currentArrears > 0) {
    return "red";
  }

  return "green";
}

function getPaymentStatusLabel(
  arrearsAmount: number | null,
  isDataTidakLengkap: boolean,
) {
  if (isDataTidakLengkap) {
    return "Data Tidak Lengkap";
  }

  const currentArrears = arrearsAmount ?? 0;

  if (currentArrears < 0) {
    return "Lebihan Bayaran";
  }

  if (currentArrears > 0) {
    return "Kurang Bayaran";
  }

  return "Cukup Bayaran";
}

function getPaymentStatusFilter(
  arrearsAmount: number | null,
  isDataTidakLengkap: boolean,
): BayaranStatusFilter {
  if (isDataTidakLengkap) {
    return "tidak-lengkap";
  }

  const currentArrears = arrearsAmount ?? 0;

  if (currentArrears < 0) {
    return "lebih";
  }

  if (currentArrears > 0) {
    return "kurang";
  }

  return "cukup";
}

function isDataTidakLengkapResident(status: string | null | undefined) {
  return status === "DATA_TIDAK_LENGKAP";
}

function normalizeNullableAmount(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

function normalizeAmount(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildSearchText(values: Array<string | null | undefined>) {
  return normalizeSearchText(values.filter(Boolean).join(" "));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
