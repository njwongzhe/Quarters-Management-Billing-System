"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { Topic } from "@/app/components/InputField";
import { PaginationControls, usePaginationLogic } from "@/app/components/Pagination/Pagination";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import { ROUTES } from "@/app/constants/routes";
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
type HistoryFilter = "ALL" | "CURRENT_MONTH" | "CURRENT_YEAR";

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
        const response = await fetch(`/api/payments/${paymentId}`, {
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
    reloadToken,
  ]);

  return (
    <div
      className="fixed bottom-0 left-55 right-0 top-0 z-50 flex items-center justify-center bg-black/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-light-blue shadow-2xl"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Tutup butiran bayaran"
            onClick={onClose}
          >
            <Icon icon={commonIcons.close} size={22} />
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
          {isLoading ? (
            <LoadingState />
          ) : errorMessage ? (
            <ErrorState
              errorMessage={errorMessage}
              onRetry={() => setReloadToken((value) => value + 1)}
            />
          ) : paymentDetails && activeTab === "info" ? (
            <PaymentInfoTab paymentDetails={paymentDetails} />
          ) : paymentDetails ? (
            <PaymentHistoryTab paymentDetails={paymentDetails} />
          ) : null}
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
  const profileHref = `${ROUTES.penghuni}?targetId=${paymentDetails.resident.id}`;
  const unitHref =
    paymentDetails.quarters.categoryId && paymentDetails.quarters.unitId
      ? `${ROUTES.kuarters}/${paymentDetails.quarters.categoryId}?targetUnitId=${encodeURIComponent(
          paymentDetails.quarters.unitId,
        )}`
      : null;
  const arrearsAmount = paymentDetails.payment.arrearsAmount;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Topic content="MAKLUMAT PENGHUNI" />
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1 rounded-xl py-2 text-[11px] font-bold uppercase text-dark-blue transition hover:underline"
          >
            PROFIL PENUH
            <Icon icon={commonIcons.chevronRight} size={17} />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <DetailField
            className="lg:col-span-6"
            label="NAMA PENGHUNI"
            value={paymentDetails.resident.name}
          />
          <DetailField
            className="lg:col-span-4"
            label="NO. KAD PENGENALAN"
            value={formatIcNumber(paymentDetails.resident.ic)}
          />
          <DetailField
            className="lg:col-span-2"
            label="STATUS PENGHUNI"
            value={paymentDetails.resident.statusLabel}
            success={paymentDetails.resident.status === "AKTIF"}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Topic content="MAKLUMAT KUARTERS" />
          {unitHref ? (
            <Link
              href={unitHref}
              className="inline-flex items-center gap-1 rounded-xl py-2 text-[11px] font-bold uppercase text-dark-blue transition hover:underline"
            >
              LIHAT UNIT
              <Icon icon={commonIcons.chevronRight} size={17} />
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <DetailField
            className="lg:col-span-4"
            label="KATEGORI"
            value={paymentDetails.quarters.categoryName}
          />
          <DetailField
            className="lg:col-span-6"
            label="ALAMAT"
            value={paymentDetails.quarters.address ?? "N/A"}
            muted={!paymentDetails.quarters.address}
          />
          <DetailField
            className="lg:col-span-2"
            label="ID UNIT"
            value={paymentDetails.quarters.unitCode}
          />
          <DetailField
            className="lg:col-span-3"
            label="TARIKH MASUK"
            value={formatDate(paymentDetails.quarters.moveInDate)}
          />
          <DetailField
            className="lg:col-span-3"
            label="TARIKH KELUAR"
            value={formatDate(paymentDetails.quarters.moveOutDate)}
            muted={!paymentDetails.quarters.moveOutDate}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Topic content="MAKLUMAT BAYARAN" />
        <div className="relative overflow-hidden rounded-lg bg-dark-blue p-6 text-white shadow-[0_24px_40px_rgba(23,31,111,0.18)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
            <div className="text-xs font-bold uppercase text-light-grey">
              AMAUN BAYAR BULAN KINI
            </div>
            <div className="text-sm font-bold">
              RM {formatMoney(paymentDetails.payment.amountThisMonth)}
            </div>
          </div>
          <div className="pt-6">
            <div className="mb-2 text-xs font-bold uppercase text-light-grey">
              BAKI TUNGGAKAN
            </div>
            <div className="text-lg font-bold text-red">
              {arrearsAmount === null ? "N/A" : `RM ${formatMoney(arrearsAmount)}`}
            </div>
            <div className="mt-3 text-xs font-extralight text-light-grey">
              {paymentDetails.payment.statusLabel}
            </div>
          </div>
          <div className="absolute bottom-6 right-6 grid h-18 w-18 place-items-center rounded-2xl bg-white/10">
            <Icon
              icon={paymentDetails.payment.status === "cukup" ? "check_circle" : "priority_high"}
              size={44}
              filled
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function PaymentHistoryTab({
  paymentDetails,
}: {
  paymentDetails: BayaranDetail;
}) {
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filteredHistory = useMemo(
    () => filterPaymentHistory(paymentDetails.history, historyFilter),
    [historyFilter, paymentDetails.history],
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
    if (!isFilterMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (filterMenuRef.current?.contains(target)) {
        return;
      }

      setIsFilterMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isFilterMenuOpen]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Topic content="SEJARAH PEMBAYARAN" />

        <div className="flex items-center gap-4">
          <ToolbarButton
            icon={commonIcons.download}
            label="Muat turun sejarah pembayaran"
            disabled={filteredHistory.length === 0}
            onClick={() => downloadPaymentHistory(paymentDetails, filteredHistory)}
          />
          <div ref={filterMenuRef} className="relative">
            <ToolbarButton
              icon={commonIcons.filter}
              label={`Tapis sejarah pembayaran: ${getHistoryFilterLabel(historyFilter)}`}
              isActive={isFilterMenuOpen || historyFilter !== "ALL"}
              hasPopup="menu"
              isExpanded={isFilterMenuOpen}
              onClick={() => setIsFilterMenuOpen((value) => !value)}
            />

            {isFilterMenuOpen ? (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-light-grey/20 bg-white p-2 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
                role="listbox"
                aria-label="Tapisan sejarah pembayaran"
              >
                {(["ALL", "CURRENT_MONTH", "CURRENT_YEAR"] as const).map(
                  (option) => {
                    const isSelected = historyFilter === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                          isSelected
                            ? "bg-dark-blue text-white"
                            : "text-dark-grey hover:bg-light-blue"
                        }`}
                        onClick={() => {
                          setHistoryFilter(option);
                          setIsFilterMenuOpen(false);
                        }}
                      >
                        <span>{getHistoryFilterLabel(option)}</span>
                        {isSelected ? <Icon icon="done" size={16} /> : null}
                      </button>
                    );
                  },
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-light-grey/20 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190">
            <thead>
              <tr className="bg-background text-xs font-bold text-grey">
                <th className="px-4 py-3 text-left">Tarikh</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">No. Resit</th>
                <th className="px-4 py-3 text-left">Catatan</th>
                <th className="px-4 py-3 text-right">Amaun (RM)</th>
              </tr>
            </thead>
            <tbody>
              {currentHistory.length === 0 ? (
                <tr>
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
                    className="border-b border-light-grey/20 text-sm last:border-b-0"
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
                  className="border-t border-light-grey/20 bg-white px-4 py-4"
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
    </div>
  );
}

function DetailField({
  className = "",
  href,
  label,
  muted = false,
  strong = false,
  success = false,
  value,
}: {
  className?: string;
  href?: string | null;
  label: string;
  muted?: boolean;
  strong?: boolean;
  success?: boolean;
  value: string;
}) {
  const contentClass = [
    "flex min-h-12 items-center justify-between gap-3 rounded-md border border-light-grey/40 bg-transparent px-3 py-3 text-sm",
    strong ? "font-bold text-dark-blue" : "text-dark-grey",
    muted ? "text-[#8B9BB0]" : "",
    success ? "font-bold text-green" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className="min-w-0 truncate">{value}</span>
      {href ? (
        <Icon
          icon={commonIcons.externalLink}
          size={18}
          className="shrink-0 text-grey/70"
        />
      ) : null}
    </>
  );

  return (
    <div className={`flex min-w-0 flex-col gap-2 tracking-widest ${className}`}>
      <div className="pl-1 text-[10px] font-bold text-gray-500">
        {label}
      </div>
      {href ? (
        <Link href={href} className={contentClass}>
          {content}
        </Link>
      ) : (
        <div className={contentClass}>{content}</div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <div className="text-center">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-dark-blue/20 border-t-dark-blue"
          aria-hidden="true"
        />
        <p className="mt-4 text-sm font-semibold text-grey">
          Mendapatkan Butiran Bayaran...
        </p>
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

function filterPaymentHistory(
  history: BayaranPaymentHistoryRow[],
  filter: HistoryFilter,
) {
  if (filter === "ALL") {
    return history;
  }

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return history.filter((row) => {
    const rowDate = new Date(row.date);

    if (Number.isNaN(rowDate.getTime())) {
      return false;
    }

    if (filter === "CURRENT_MONTH") {
      return (
        rowDate.getMonth() === currentMonth &&
        rowDate.getFullYear() === currentYear
      );
    }

    return rowDate.getFullYear() === currentYear;
  });
}

function getHistoryFilterLabel(filter: HistoryFilter) {
  if (filter === "CURRENT_MONTH") return "Bulan Ini";
  if (filter === "CURRENT_YEAR") return "Tahun Ini";

  return "Semua Rekod";
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

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}
