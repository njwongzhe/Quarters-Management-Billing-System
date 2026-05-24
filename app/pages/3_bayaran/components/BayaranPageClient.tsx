"use client";

import { useEffect, useMemo, useState } from "react";

import AddPaymentOverlay from "./AddPaymentOverlay";
import BayaranDownload from "./BayaranDownload";
import BayaranDetailOverlay from "./BayaranDetailOverlay";
import BayaranFilterShell from "./BayaranFilterShell";
import BayaranPageHeader from "./BayaranPageHeader";
import BayaranPagination from "./BayaranPagination";
import BayaranRecordsTable from "./BayaranRecordsTable";
import BayaranStatsCards from "./BayaranStatsCards";
import { bayaranStatusFilters } from "@/lib/payments/bayaran-constants";
import {
  createDefaultBayaranFilters,
  filterBayaranRecords,
  getVisiblePages,
} from "@/lib/payments/bayaran-helpers";
import type {
  BayaranExportRow,
  BayaranDetail,
  BayaranFilters,
  BayaranPaginationItem,
  BayaranRow,
  BayaranStatCard,
  BayaranStatusFilter,
} from "@/lib/payments/bayaran-types";

type BayaranPageData = {
  rows: BayaranRow[];
  exportRows: BayaranExportRow[];
  stats: BayaranStatCard[];
  detailsByPaymentId: Record<string, BayaranDetail>;
};

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
const CURRENT_PAYMENT_MONTH_KEY = getMonthKey(new Date());

const EMPTY_BAYARAN_DATA: BayaranPageData = {
  rows: [],
  exportRows: [],
  detailsByPaymentId: {},
  stats: [
    {
      label: "Jumlah Rekod",
      helper: "Terkini",
      icon: "fact_check",
      accent: "border-l-dark-blue",
      dot: "bg-dark-blue",
      helperColor: "text-dark-blue",
      value: "0",
    },
    {
      label: "Cukup Bayaran",
      helper: "Bayaran Lengkap",
      icon: "check_circle",
      accent: "border-l-cukup",
      dot: "bg-cukup",
      helperColor: "text-cukup",
      value: "0",
    },
    {
      label: "Kurang Bayaran",
      helper: "Perlu Semakan",
      icon: "error",
      accent: "border-l-kurang",
      dot: "bg-kurang",
      helperColor: "text-kurang",
      value: "0",
    },
    {
      label: "Lebihan Bayaran",
      helper: "Kredit Tersimpan",
      icon: "add_circle",
      accent: "border-l-lebih",
      dot: "bg-lebih",
      helperColor: "text-lebih",
      value: "0",
    },
    {
      label: "Data Tidak Lengkap",
      helper: "Tindakan Segera",
      icon: "warning",
      accent: "border-l-x-lengkap",
      dot: "bg-x-lengkap",
      helperColor: "text-x-lengkap",
      value: "0",
    },
  ],
};

export default function BayaranPageClient() {
  const [filters, setFilters] = useState<BayaranFilters>(
    createDefaultBayaranFilters,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentMonthKey, setPaymentMonthKey] = useState(
    CURRENT_PAYMENT_MONTH_KEY,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedAddPaymentId, setSelectedAddPaymentId] = useState<string | null>(
    null,
  );
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [pageState, setPageState] = useState<BayaranPageState>({
    data: EMPTY_BAYARAN_DATA,
    errorMessage: "",
    isLoaded: false,
  });
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
  const visiblePages: BayaranPaginationItem[] = getVisiblePages(
    safeCurrentPage,
    totalPages,
  );
  const paymentMonthLabel = formatPaymentMonthLabel(paymentMonthKey);
  const canGoNextPaymentMonth = paymentMonthKey < CURRENT_PAYMENT_MONTH_KEY;

  useEffect(() => {
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
  }, [paymentMonthKey, reloadToken]);

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
    if (direction === 1 && paymentMonthKey >= CURRENT_PAYMENT_MONTH_KEY) {
      return;
    }

    setPageState((currentState) => ({
      ...currentState,
      errorMessage: "",
      isLoaded: false,
    }));
    setPaymentMonthKey(shiftMonthKey(paymentMonthKey, direction));
  }

  function handleReloadBayaranData() {
    setPageState((currentState) => ({
      ...currentState,
      errorMessage: "",
      isLoaded: false,
    }));
    setReloadToken((value) => value + 1);
  }

  return (
    <section className="min-h-full bg-background pb-4 pt-2 text-[#111827]">
      <div className="flex w-full flex-col gap-7">
        <BayaranPageHeader />
        <BayaranStatsCards stats={data.stats} />

        <BayaranFilterShell
          downloadButton={<BayaranDownload exportRows={filteredExportRows} />}
          filterQuery={filters.query}
          statusFilter={filters.statuses}
          onFilterQueryChange={handleFilterQueryChange}
          onStatusFilterChange={handleStatusFilterChange}
        >
          {errorMessage ? (
            <div className="border-b border-light-grey/20 bg-[#FFF4F4] px-6 py-3 text-sm font-semibold text-[#B42318]">
              {errorMessage}
            </div>
          ) : null}
          <BayaranRecordsTable
            rows={visibleRows}
            canGoNextPaymentMonth={canGoNextPaymentMonth}
            isLoading={isLoading}
            onAddPayment={setSelectedAddPaymentId}
            onNextPaymentMonth={() => handlePaymentMonthChange(1)}
            onPreviousPaymentMonth={() => handlePaymentMonthChange(-1)}
            onViewPayment={setSelectedPaymentId}
            paymentMonthLabel={paymentMonthLabel}
          />
          <BayaranPagination
            currentPage={safeCurrentPage}
            firstVisibleRecord={firstVisibleRecord}
            lastVisibleRecord={lastVisibleRecord}
            onPageChange={setCurrentPage}
            totalPages={totalPages}
            totalRecordCount={totalRecordCount}
            visiblePages={visiblePages}
          />
        </BayaranFilterShell>
      </div>

      {selectedPaymentId ? (
        <BayaranDetailOverlay
          key={selectedPaymentId}
          initialPaymentDetails={data.detailsByPaymentId[selectedPaymentId]}
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      ) : null}

      {selectedAddPaymentId && data.detailsByPaymentId[selectedAddPaymentId] ? (
        <AddPaymentOverlay
          paymentDetails={data.detailsByPaymentId[selectedAddPaymentId]}
          onClose={() => setSelectedAddPaymentId(null)}
          onSaved={handleReloadBayaranData}
        />
      ) : null}
    </section>
  );
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
