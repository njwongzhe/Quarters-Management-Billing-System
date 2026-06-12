"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import AddPaymentOverlay from "./AddPaymentOverlay";
import Icon from "@/app/components/Icon/Icon";
import BayaranDownload from "./BayaranDownload";
import BayaranDetailOverlay from "./BayaranDetailOverlay";
import BayaranFilterShell from "./BayaranFilterShell";
import BayaranPageHeader from "./BayaranPageHeader";
import BayaranPagination from "./BayaranPagination";
import BayaranRecordsTable from "./BayaranRecordsTable";
import BayaranStatsCards from "./BayaranStatsCards";
import {
  bayaranStatTemplates,
  bayaranStatusFilters,
} from "@/lib/payments/bayaran-constants";
import {
  createDefaultBayaranFilters,
  filterBayaranRecords,
} from "@/lib/payments/bayaran-helpers";
import type {
  BayaranDetail,
  BayaranFilters,
  BayaranStatCard,
  BayaranStatusFilter,
  ManualPaymentMutationResult,
} from "@/lib/payments/bayaran-types";
import type { BayaranPageData } from "@/lib/payments/bayaran-page";

type BayaranPageResponse = {
  success: boolean;
  message?: string;
  data?: BayaranPageData;
};

type BayaranPageState = {
  data: BayaranPageData;
  errorMessage: string;
  isLoaded: boolean;
};

const BAYARAN_ROWS_PER_PAGE = 10;
const EMPTY_BAYARAN_STATS: BayaranStatCard[] = bayaranStatTemplates.map((stat) => ({
  ...stat,
  value: "0",
}));

const EMPTY_BAYARAN_DATA: BayaranPageData = {
  rows: [],
  exportRows: [],
  stats: EMPTY_BAYARAN_STATS,
};

type BayaranPageClientProps = {
  currentPaymentMonthKey?: string;
  initialData?: BayaranPageData;
};

export default function BayaranPageClient({
  currentPaymentMonthKey = getMonthKey(new Date()),
  initialData,
}: BayaranPageClientProps) {
  const hasInitialData = initialData !== undefined;
  const [filters, setFilters] = useState<BayaranFilters>(
    createDefaultBayaranFilters,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentMonthKey, setPaymentMonthKey] = useState(
    currentPaymentMonthKey,
  );
  const [selectedAddPaymentId, setSelectedAddPaymentId] = useState<string | null>(
    null,
  );
  const [selectedAddPaymentDetails, setSelectedAddPaymentDetails] =
    useState<BayaranDetail | null>(null);
  const [addPaymentError, setAddPaymentError] = useState("");
  const [isLoadingAddPayment, setIsLoadingAddPayment] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [pageState, setPageState] = useState<BayaranPageState>({
    data: initialData ?? EMPTY_BAYARAN_DATA,
    errorMessage: "",
    isLoaded: hasInitialData,
  });
  const shouldSkipInitialFetchRef = useRef(hasInitialData);
  const isLoading = !pageState.isLoaded;
  const data = pageState.data;
  const errorMessage = pageState.errorMessage;
  const filteredRows = useMemo(
    () => filterBayaranRecords(data.rows, filters),
    [data.rows, filters],
  );
  const filteredExportRows = useMemo(
    () => filterBayaranRecords(data.exportRows, filters),
    [data.exportRows, filters],
  );
  const filteredStats = useMemo(() => {
    const total = filteredRows.length;
    const cukup = filteredRows.filter((row) => row.paymentStatus === "cukup").length;
    const kurang = filteredRows.filter((row) => row.paymentStatus === "kurang").length;
    const lebih = filteredRows.filter((row) => row.paymentStatus === "lebih").length;
    const tidakLengkap = filteredRows.filter(
      (row) => row.paymentStatus === "tidak-lengkap",
    ).length;

    const values = [total, cukup, kurang, lebih, tidakLengkap];

    return bayaranStatTemplates.map((template, index) => ({
      ...template,
      value: values[index].toLocaleString("ms-MY"),
    }));
  }, [filteredRows]);
  const totalRecordCount = filteredRows.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalRecordCount / BAYARAN_ROWS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * BAYARAN_ROWS_PER_PAGE;
  const visibleRows = filteredRows.slice(
    startIndex,
    startIndex + BAYARAN_ROWS_PER_PAGE,
  );
  const firstVisibleRecord = totalRecordCount === 0 ? 0 : startIndex + 1;
  const lastVisibleRecord = Math.min(
    startIndex + visibleRows.length,
    totalRecordCount,
  );
  const paymentMonthLabel = formatPaymentMonthLabel(paymentMonthKey);
  const canGoNextPaymentMonth = paymentMonthKey < currentPaymentMonthKey;

  useEffect(() => {
    if (shouldSkipInitialFetchRef.current) {
      shouldSkipInitialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();
    const queryParams = new URLSearchParams({
      paymentMonth: paymentMonthKey,
    });

    fetch(`/api/payments?${queryParams.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | BayaranPageResponse
          | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.message ?? "Gagal mendapatkan data bayaran.");
        }

        setPageState({
          data: payload.data,
          errorMessage: "",
          isLoaded: true,
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPageState((currentState) => ({
          data: currentState.data,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Gagal mendapatkan data bayaran.",
          isLoaded: true,
        }));
      });

    return () => controller.abort();
  }, [paymentMonthKey]);

  function handleFilterQueryChange(value: string) {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      query: value,
    }));
  }

  function handleStatusFilterChange(values: BayaranStatusFilter[]) {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      statuses: values,
      statusMode: values.length !== bayaranStatusFilters.length,
    }));
  }

  function handlePaymentMonthChange(direction: -1 | 1) {
    if (direction === 1 && paymentMonthKey >= currentPaymentMonthKey) {
      return;
    }

    setPageState((currentState) => ({
      data: {
        ...currentState.data,
        stats: EMPTY_BAYARAN_STATS,
      },
      errorMessage: "",
      isLoaded: false,
    }));
    setPaymentMonthKey(shiftMonthKey(paymentMonthKey, direction));
  }

  function handlePaymentMonthSelect(monthKey: string) {
    if (!/^\d{4}-\d{2}$/.test(monthKey) || monthKey > currentPaymentMonthKey) {
      return;
    }

    setCurrentPage(1);
    setPageState((currentState) => ({
      data: {
        ...currentState.data,
        stats: EMPTY_BAYARAN_STATS,
      },
      errorMessage: "",
      isLoaded: false,
    }));
    setPaymentMonthKey(monthKey);
  }

  function handleManualPaymentSaved(result: ManualPaymentMutationResult) {
    if (!selectedAddPaymentDetails) {
      return;
    }

    const nextArrears =
      (selectedAddPaymentDetails.payment.arrearsAmount ?? 0) -
      result.totalAmount;
    const nextAmountThisMonth =
      selectedAddPaymentDetails.payment.amountThisMonth +
      result.amountThisMonthDelta;
    const paymentStatus = getPaymentStatus(
      nextArrears,
      selectedAddPaymentDetails.resident.status,
    );
    const formattedArrears = formatMoney(nextArrears);
    const formattedAmount = formatMoney(nextAmountThisMonth);

    setSelectedAddPaymentDetails((currentDetails) =>
      currentDetails
        ? {
            ...currentDetails,
            payment: {
              ...currentDetails.payment,
              amountThisMonth: nextAmountThisMonth,
              arrearsAmount: nextArrears,
              status: paymentStatus,
              statusLabel: getPaymentStatusLabel(
                nextArrears,
                currentDetails.resident.status,
              ),
            },
          }
        : null,
    );
    setPageState((currentState) => ({
      ...currentState,
      data: {
        ...currentState.data,
        rows: currentState.data.rows.map((row) =>
          row.residentId === result.residentId
            ? {
                ...row,
                arrears: formattedArrears,
                amount: formattedAmount,
                paymentStatus,
                tone: getPaymentTone(paymentStatus),
              }
            : row,
        ),
        exportRows: currentState.data.exportRows.map((row) =>
          row.ic === selectedAddPaymentDetails.resident.ic
            ? {
                ...row,
                arrearsAmount: nextArrears,
                amount: nextAmountThisMonth,
                status: getPaymentStatusLabel(
                  nextArrears,
                  selectedAddPaymentDetails.resident.status,
                ),
                paymentStatus,
              }
            : row,
        ),
      },
    }));
  }

  async function handleAddPayment(paymentId: string) {
    setSelectedAddPaymentId(paymentId);
    setSelectedAddPaymentDetails(null);
    setAddPaymentError("");
    setIsLoadingAddPayment(true);

    try {
      const queryParams = new URLSearchParams({
        paymentMonth: paymentMonthKey,
      });
      const response = await fetch(
        `/api/payments/${paymentId}?${queryParams.toString()}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload.data?.payment) {
        throw new Error(payload?.message ?? "Gagal mendapatkan butiran bayaran.");
      }

      setSelectedAddPaymentDetails(payload.data.payment as BayaranDetail);
    } catch (error) {
      setAddPaymentError(
        error instanceof Error
          ? error.message
          : "Gagal mendapatkan butiran bayaran.",
      );
    } finally {
      setIsLoadingAddPayment(false);
    }
  }

  return (
    <main className="relative flex flex-col gap-4 pb-4 text-content">
      <div className="flex w-full flex-col gap-4">
        <BayaranPageHeader />
        <BayaranStatsCards stats={filteredStats} />

        <BayaranFilterShell
          downloadButton={(
            <BayaranDownload
              disabled={isLoading}
              exportRows={filteredExportRows}
            />
          )}
          filterQuery={filters.query}
          statusFilter={filters.statuses}
          onFilterQueryChange={handleFilterQueryChange}
          onStatusFilterChange={handleStatusFilterChange}
        >
          <BayaranRecordsTable
            rows={visibleRows}
            canGoNextPaymentMonth={canGoNextPaymentMonth}
            errorMessage={errorMessage}
            isLoading={isLoading}
            loadingColumnCount={5}
            loadingRowCount={10}
            onAddPayment={handleAddPayment}
            onNextPaymentMonth={() => handlePaymentMonthChange(1)}
            onPaymentMonthSelect={handlePaymentMonthSelect}
            onPreviousPaymentMonth={() => handlePaymentMonthChange(-1)}
            onViewPayment={setSelectedPaymentId}
            paymentMonthKey={paymentMonthKey}
            paymentMonthLabel={paymentMonthLabel}
          />
          <BayaranPagination
            currentPage={safeCurrentPage}
            firstVisibleRecord={firstVisibleRecord}
            lastVisibleRecord={lastVisibleRecord}
            onPageChange={setCurrentPage}
            totalPages={totalPages}
            totalRecordCount={totalRecordCount}
          />
        </BayaranFilterShell>
      </div>

      {selectedPaymentId ? (
        <BayaranDetailOverlay
          key={selectedPaymentId}
          paymentMonthKey={paymentMonthKey}
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      ) : null}

      {selectedAddPaymentId && selectedAddPaymentDetails ? (
        <AddPaymentOverlay
          paymentDetails={selectedAddPaymentDetails}
          paymentMonthKey={paymentMonthKey}
          onClose={() => setSelectedAddPaymentId(null)}
          onSaved={handleManualPaymentSaved}
        />
      ) : null}

      {selectedAddPaymentId &&
      !selectedAddPaymentDetails &&
      (isLoadingAddPayment || addPaymentError) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-xl">
            {isLoadingAddPayment ? (
              <>
                <Icon
                  icon="progress_activity"
                  size={28}
                  className="mx-auto animate-spin text-dark-blue"
                />
                <p className="mt-3 text-sm font-semibold text-content">
                  Memuatkan butiran bayaran...
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-red">
                  {addPaymentError}
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-dark-blue px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => setSelectedAddPaymentId(null)}
                >
                  Tutup
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function getPaymentStatus(
  arrearsAmount: number,
  residentStatus: string,
): BayaranStatusFilter {
  if (residentStatus === "DATA_TIDAK_LENGKAP") return "tidak-lengkap";
  if (arrearsAmount < 0) return "lebih";
  if (arrearsAmount > 0) return "kurang";
  return "cukup";
}

function getPaymentStatusLabel(
  arrearsAmount: number,
  residentStatus: string,
) {
  if (residentStatus === "DATA_TIDAK_LENGKAP") return "Data Tidak Lengkap";
  if (arrearsAmount < 0) return "Lebihan Bayaran";
  if (arrearsAmount > 0) return "Kurang Bayaran";
  return "Cukup Bayaran";
}

function getPaymentTone(
  paymentStatus: BayaranStatusFilter,
): "green" | "red" | "blue" | "purple" {
  if (paymentStatus === "cukup") return "green";
  if (paymentStatus === "kurang") return "red";
  if (paymentStatus === "lebih") return "blue";
  return "purple";
}

function formatMoney(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMonthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(monthKey: string, direction: -1 | 1) {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1 + direction, 1);

  return getMonthKey(date);
}

function formatPaymentMonthLabel(monthKey: string) {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("ms-MY", {
    month: "short",
    year: "numeric",
  }).format(date);
}
