"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import FilterDate from "@/app/components/FIlter/FilterDate";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { Topic } from "@/app/components/InputField";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import { PaginationControls, usePaginationLogic } from "@/app/components/Pagination/Pagination";
import PenghuniCompleteWithKuartersDetail from "@/app/components/RecordNavigation/PenghuniCompleteWithKuartersDetail";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/download/xlsx-export";
import type {
  BayaranDetail,
  BayaranPaymentHistoryRow,
} from "@/lib/payments/bayaran-types";

type BayaranDetailOverlayProps = {
  initialPaymentDetails?: BayaranDetail;
  paymentMonthKey: string;
  paymentId: string;
  onClose: () => void;
};

type BayaranDetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    payment?: BayaranDetail;
  };
};

type ActiveTab = "info" | "history";
type DateFilter = { startDate: string; endDate: string };

const HISTORY_PAGE_SIZE = 10;

function TabButton({
  children,
  isActive,
  onClick,
}: {
  children: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`-mb-px py-4 text-sm font-bold transition-colors ${
        isActive
          ? "border-b-4 border-dark-blue text-dark-blue"
          : "text-gray-500 hover:text-dark-blue"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function BayaranDetailOverlay({
  initialPaymentDetails,
  paymentMonthKey,
  paymentId,
  onClose,
}: BayaranDetailOverlayProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("info");
  const [paymentDetails, setPaymentDetails] = useState<BayaranDetail | null>(
    initialPaymentDetails?.id === paymentId ? initialPaymentDetails : null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(
    initialPaymentDetails?.id !== paymentId,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const hasLoadedHistory = paymentDetails?.historyLoaded === true;

  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (
      reloadToken === 0 &&
      initialPaymentDetails?.id === paymentId &&
      (activeTab !== "history" || hasLoadedHistory)
    ) {
      return;
    }

    const controller = new AbortController();

    async function loadPaymentDetails() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const queryParams = new URLSearchParams({
          paymentMonth: paymentMonthKey,
        });
        const response = await fetch(`/api/payments/${paymentId}?${queryParams.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | BayaranDetailResponse
          | null;

        if (!response.ok || !payload?.success || !payload.data?.payment) {
          throw new Error(
            payload?.message ?? "Gagal mendapatkan butiran bayaran.",
          );
        }

        setPaymentDetails(payload.data.payment);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setPaymentDetails(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan butiran bayaran.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPaymentDetails();

    return () => {
      controller.abort();
    };
  }, [
    activeTab,
    hasLoadedHistory,
    initialPaymentDetails,
    paymentId,
    paymentMonthKey,
    reloadToken,
  ]);

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-start justify-center bg-black/45 p-12 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between bg-dark-blue p-6 text-white">
          <div>
            <h2 id="payment-details-title" className="text-lg font-bold">
              BUTIRAN BAYARAN
            </h2>
            <p className="text-xs font-extralight text-light-grey">
              MAKLUMAT TERPERINCI PEMBAYARAN SEMASA
            </p>
          </div>
          <button
            type="button"
            className="hover:scale-96 active:scale-92 text-white"
            aria-label="Tutup butiran bayaran"
            onClick={onClose}
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        <nav
          className="flex items-center justify-center gap-8 border-b border-light-grey/20 bg-white"
          aria-label="Tab butiran bayaran"
        >
          <TabButton
            isActive={activeTab === "info"}
            onClick={() => setActiveTab("info")}
          >
            MAKLUMAT BAYARAN
          </TabButton>
          <TabButton
            isActive={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            SEJARAH PEMBAYARAN
          </TabButton>
        </nav>

        <div className="overflow-y-auto bg-light-blue p-6">
          {errorMessage ? (
            <ErrorState
              errorMessage={errorMessage}
              onRetry={() => setReloadToken((value) => value + 1)}
            />
          ) : activeTab === "info" ? (
            paymentDetails ? (
              <PaymentInfoTab paymentDetails={paymentDetails} />
            ) : (
              <div className="flex min-h-96 items-center justify-center text-sm font-semibold text-grey">
                Sedang mendapatkan butiran bayaran...
              </div>
            )
          ) : (
            <PaymentHistoryTab
              paymentDetails={paymentDetails}
              isLoading={isLoading}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function PaymentInfoTab({
  paymentDetails,
}: {
  paymentDetails: BayaranDetail;
}) {
  const arrearsAmount = paymentDetails.payment.arrearsAmount ?? 0;
  const currentOccupancy = {
    occupantId: paymentDetails.resident.id,
    occupantName: paymentDetails.resident.name,
    occupantIcNumber: paymentDetails.resident.ic,
    occupantAge: paymentDetails.resident.age,
    quarterClass: paymentDetails.quarters.categoryName,
    quarterUnit: paymentDetails.quarters.unitCode,
    quarterAddress: paymentDetails.quarters.address,
    moveInDate: paymentDetails.quarters.moveInDate,
    moveOutDate: paymentDetails.quarters.moveOutDate,
    occupantStatus: paymentDetails.resident.status,
  };

  return (
    <div className="flex flex-col gap-8">
      <PenghuniCompleteWithKuartersDetail
        currentOccupancy={currentOccupancy}
        actionButton={{
          type: "profile",
          residentId: paymentDetails.resident.id,
          label: "Profil Penuh",
        }}
      />

      <section className="flex flex-col gap-4">
        <Topic content="MAKLUMAT BAYARAN" />
        <div className="flex flex-col gap-3 relative overflow-hidden rounded-lg bg-dark-blue p-4 text-white shadow-[0_24px_40px_rgba(23,31,111,0.18)]">
          {/* Total Payment Current Month */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-bold uppercase text-light-grey">AMAUN BAYAR BULAN KINI</div>
            <div className="text-sm font-bold">RM {formatMoney(paymentDetails.payment.amountThisMonth)}</div>
          </div>
          
          <hr className="border-white/20" />

          <div className="flex items-center justify-between">
            {/* Arrears Left */}
            <div className="flex flex-col gap-1">
              <div className="text-xs font-bold uppercase text-light-grey">BAKI TUNGGAKAN</div>
              <div className="text-2xl font-bold text-red">RM {formatMoney(arrearsAmount)}</div>
              <div className="text-xs font-extralight text-light-grey">{paymentDetails.payment.statusLabel}</div>
            </div>

            {/* Icon */}
            <div className="grid h-18 w-18 place-items-center rounded-2xl bg-white/10">
              <Icon
                icon={paymentDetails.payment.status === "cukup" ? "check_circle" : "priority_high"}
                size={44}
                filled
              />
            </div> 
          </div>
          
        </div>
      </section>
    </div>
  );
}

function PaymentHistoryTab({
  paymentDetails,
  isLoading,
}: {
  paymentDetails: BayaranDetail | null;
  isLoading: boolean;
}) {
  const dateFilterButtonRef = useRef<HTMLDivElement | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: "",
    endDate: "",
  });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [dateFilterAnchorStyle, setDateFilterAnchorStyle] = useState<CSSProperties>({});
  const historyRecords = paymentDetails?.history ?? [];
  const filteredHistory = useMemo(
    () => filterPaymentHistoryByDate(historyRecords, dateFilter),
    [dateFilter, historyRecords],
  );
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
    paginationItems,
  } = usePaginationLogic(filteredHistory.length, HISTORY_PAGE_SIZE);
  const currentHistory = filteredHistory.slice(startIndex, endIndex);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;

      if (
        dateFilterButtonRef.current &&
        !dateFilterButtonRef.current.contains(target) &&
        !target?.closest("[data-filter-date-panel]")
      ) {
        setIsDateFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleToggleDateFilter() {
    if (!isDateFilterOpen && dateFilterButtonRef.current) {
      const rect = dateFilterButtonRef.current.getBoundingClientRect();
      setDateFilterAnchorStyle({
        position: "fixed",
        top: rect.bottom,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }

    setIsDateFilterOpen((currentValue) => !currentValue);
  }

  const isDateFilterActive = Boolean(dateFilter.startDate || dateFilter.endDate);

  const dateFilterPanel =
    isDateFilterOpen && typeof document !== "undefined"
      ? createPortal(
          <div style={dateFilterAnchorStyle} data-filter-date-panel>
            <FilterDate
              title="Tapis Tarikh"
              description="Pilihan tarikh akan ditapis secara automatik"
              ariaLabel="Tapis sejarah pembayaran mengikut tarikh"
              value={dateFilter}
              onApply={(value) => {
                setDateFilter(value);
              }}
              onClear={() => {
                setDateFilter({ startDate: "", endDate: "" });
              }}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Topic content="SEJARAH PEMBAYARAN" />

        <div className="flex flex-row gap-4 items-center">
          <div ref={dateFilterButtonRef}>
            <ToolbarButton
              icon={commonIcons.calendar}
              label="Tapis sejarah pembayaran mengikut tarikh"
              disabled={isLoading}
              isActive={isDateFilterActive || isDateFilterOpen}
              onClick={handleToggleDateFilter}
            />
          </div>
          <ToolbarButton
            icon={commonIcons.download}
            label="Muat turun sejarah pembayaran"
            disabled={isLoading}
            onClick={() => {
              if (!paymentDetails) {
                return;
              }

              downloadPaymentHistory(paymentDetails, filteredHistory);
            }}
          />
        </div>
      </div>

      {dateFilterPanel}

      <div className="rounded-lg overflow-hidden border border-light-grey/20">
        <table className="w-full overflow-x-auto">
            <thead>
              <tr className="bg-background text-xs font-bold text-grey">
                <th className="px-4 py-3 text-left">Tarikh</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">No. Resit</th>
                <th className="px-4 py-3 text-left">Catatan</th>
                <th className="px-4 py-3 text-right">Amaun (RM)</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isLoading ? (
                loadingTableRows({
                  mode: "loading",
                  rowCount: HISTORY_PAGE_SIZE,
                  columnCount: 5,
                })
              ) : currentHistory.length === 0 ? (
                <tr className="text-sm">
                  <td
                    className="px-4 py-4 text-center text-sm text-grey"
                    colSpan={5}
                  >
                    Tiada sejarah pembayaran ditemui.
                  </td>
                </tr>
              ) : (
                currentHistory.map((history) => (
                  <tr
                    key={`${history.id}-${history.date}`}
                    className="text-sm border-b border-b-light-grey/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-left font-medium">
                      {formatDate(history.date)}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {history.id}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {history.receiptNo ?? "N/A"}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {history.description ?? "Bayaran Diterima"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green">
                      {formatMoney(history.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={5}
                  className="bg-white border-t border-light-grey/20 px-4 py-4"
                >
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalRecords={filteredHistory.length}
                    paginationItems={paginationItems}
                    onPageChange={handlePageChange}
                  />
                </td>
              </tr>
            </tfoot>
          </table>
      </div>
    </div>
  );
}

function ErrorState({
  errorMessage,
  onRetry,
}: {
  errorMessage: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
        <h3 className="text-lg font-extrabold text-dark-grey">
          Butiran Tidak Dapat Dipaparkan
        </h3>
        <p className="mt-2 text-sm leading-6 text-grey">{errorMessage}</p>
        <button
          type="button"
          className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-dark-blue px-4 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
          onClick={onRetry}
        >
          Cuba Lagi
        </button>
      </div>
    </div>
  );
}

function filterPaymentHistoryByDate(
  history: BayaranPaymentHistoryRow[],
  filter: DateFilter,
) {
  const isFilterActive = Boolean(filter.startDate || filter.endDate);

  if (!isFilterActive) {
    return history;
  }

  return history.filter((row) => {
    const rowDate = parseRecordDate(row.date);

    if (!rowDate) {
      return false;
    }

    const rowTime = rowDate.getTime();

    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (rowTime < startDate.getTime()) {
        return false;
      }
    }

    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);

      if (rowTime > endDate.getTime()) {
        return false;
      }
    }

    return true;
  });
}

function parseRecordDate(value: string): Date | null {
  const normalizedValue = value.trim();

  const ddmmyyyyMatch = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = Number(ddmmyyyyMatch[1]);
    const month = Number(ddmmyyyyMatch[2]);
    const year = Number(ddmmyyyyMatch[3]);
    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day
    ) {
      return parsedDate;
    }

    return null;
  }

  const fallbackDate = new Date(normalizedValue);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

function downloadPaymentHistory(
  paymentDetails: BayaranDetail,
  history: BayaranPaymentHistoryRow[],
) {
  const headers: XlsxCell[] = [
    { value: "Tarikh", style: "header" },
    { value: "ID", style: "header" },
    { value: "No. Resit", style: "header" },
    { value: "Catatan", style: "header" },
    { value: "Amaun (RM)", style: "header", align: "right" },
  ];
  const rows: XlsxSheet["rows"] = history.map((row) => [
    formatDate(row.date),
    row.id,
    row.receiptNo ?? "N/A",
    row.description ?? "Bayaran Diterima",
    { value: row.amount, type: "number", align: "right" },
  ]);

  downloadXlsxFile({
    filename: `sejarah-pembayaran-${paymentDetails.resident.ic.replace(/\D/g, "")}`,
    sheets: [
      {
        name: "Sejarah Pembayaran",
        columns: [
          { width: 16 },
          { width: 24 },
          { width: 22 },
          { width: 32 },
          { width: 16 },
        ],
        rows: [headers, ...rows],
      },
    ],
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

