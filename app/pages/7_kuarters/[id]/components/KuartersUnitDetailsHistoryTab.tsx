"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import Icon, { commonIcons } from "@/app/components/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";

import type {
  QuarterUnitDetails,
  QuarterUnitOccupancyDetails,
} from "@/lib/quarter-units";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/xlsx-export";

type HistoryFilter = "ALL" | QuarterUnitOccupancyDetails["status"];

type KuartersUnitDetailsHistoryTabProps = {
  unitDetails: QuarterUnitDetails;
};
type PageItem = number | "ellipsis";

const HISTORY_PAGE_SIZE = 5;

function SectionTitle({ children }: { children: string }) {
  return (
    <h4 className="flex items-center gap-4 text-[13px] font-extrabold uppercase tracking-[0.2em] text-dark-blue sm:text-base">
      <span className="h-6 w-1.5 rounded-sm bg-dark-blue" aria-hidden="true" />
      {children}
    </h4>
  );
}

function PageButton({
  children,
  isActive = false,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors ${
        isActive
          ? "border-dark-blue bg-dark-blue font-extrabold text-white"
          : "border-[#EEF1F6] bg-white text-dark-grey hover:border-dark-blue hover:text-dark-blue"
      } disabled:cursor-not-allowed disabled:opacity-40`}
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getFilterLabel(filter: HistoryFilter) {
  if (filter === "CURRENT") {
    return "Aktif";
  }

  if (filter === "PAST") {
    return "Keluar";
  }

  return "Semua Rekod";
}

export default function KuartersUnitDetailsHistoryTab({
  unitDetails,
}: KuartersUnitDetailsHistoryTabProps) {
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<HistoryFilter>("ALL");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filteredHistory = useMemo(() => {
    if (statusFilter === "ALL") {
      return unitDetails.occupancyHistory;
    }

    return unitDetails.occupancyHistory.filter(
      (occupancy) => occupancy.status === statusFilter,
    );
  }, [statusFilter, unitDetails.occupancyHistory]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * HISTORY_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + HISTORY_PAGE_SIZE,
    filteredHistory.length,
  );
  const visibleHistory = filteredHistory.slice(startIndex, endIndex);
  const pageItems = buildPageItems(safeCurrentPage, totalPages);
  const hasHistory = filteredHistory.length > 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, unitDetails.id]);

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
    <div className="max-h-[calc(100vh-10rem)] overflow-auto px-5 py-7 sm:px-8 sm:py-8">
      <section>
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle>Sejarah Penghunian</SectionTitle>

          <div className="flex items-center gap-5 self-end text-grey">
            <ToolbarButton
              icon={commonIcons.download}
              label="Muat turun sejarah penghunian"
              onClick={() =>
                downloadHistoryExcel(unitDetails, filteredHistory)
              }
            />
            <div ref={filterMenuRef} className="relative">
              <ToolbarButton
                icon={commonIcons.filter}
                label={`Tapis sejarah penghunian: ${getFilterLabel(
                  statusFilter,
                )}`}
                isActive={isFilterMenuOpen || statusFilter !== "ALL"}
                onClick={() =>
                  setIsFilterMenuOpen((currentState) => !currentState)
                }
              />

              {isFilterMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-light-grey/20 bg-white p-2 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
                  role="listbox"
                  aria-label="Tapisan sejarah penghunian"
                >
                  {(["ALL", "CURRENT", "PAST"] as const).map((option) => {
                    const isSelected = statusFilter === option;

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
                          setStatusFilter(option);
                          setIsFilterMenuOpen(false);
                        }}
                      >
                        <span className="truncate">{getFilterLabel(option)}</span>
                        {isSelected ? <Icon icon="done" size={16} /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E8F1] bg-white shadow-[0_5px_12px_rgba(21,30,102,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-250 table-fixed border-collapse">
              <thead className="bg-[#F3F6FB]">
                <tr>
                  <th className="w-[17%] px-6 py-5 text-left text-xs font-extrabold uppercase tracking-[0.16em] text-grey">
                    Tarikh Masuk
                  </th>
                  <th className="w-[17%] px-6 py-5 text-left text-xs font-extrabold uppercase tracking-[0.16em] text-grey">
                    Tarikh Keluar
                  </th>
                  <th className="w-[28%] px-6 py-5 text-left text-xs font-extrabold uppercase tracking-[0.16em] text-grey">
                    Nama Penghuni
                  </th>
                  <th className="w-[23%] px-6 py-5 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-grey">
                    No. Kad Pengenalan
                  </th>
                  <th className="w-[15%] px-6 py-5 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-grey">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {!hasHistory ? (
                  <tr className="border-t border-[#F1F2F6]">
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm font-semibold text-grey"
                    >
                      Tiada rekod penghunian yang sepadan untuk unit ini.
                    </td>
                  </tr>
                ) : null}

                {visibleHistory.map((occupancy) => (
                  <tr key={occupancy.id} className="border-t border-[#F1F2F6]">
                    <HistoryCell value={formatHistoryDate(occupancy.moveInDate)} />
                    <HistoryCell
                      value={formatHistoryDate(occupancy.moveOutDate)}
                    />
                    <HistoryCell
                      value={occupancy.occupantName}
                    />
                    <HistoryCell
                      value={formatIcNumber(occupancy.occupantIcNumber)}
                      className="text-center tracking-wide text-dark-grey"
                    />
                    <td className="px-6 py-5 text-center align-middle">
                      <span
                        className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-extrabold uppercase ${
                          occupancy.status === "CURRENT"
                            ? "border-aktif/20 bg-aktif/10 text-aktif"
                            : "border-x-layak/20 bg-x-layak/10 text-x-layak"
                        }`}
                      >
                        {occupancy.status === "CURRENT" ? "Aktif" : "Keluar"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex min-h-18 flex-col gap-3 border-t border-[#F1F2F6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <PageButton
                label="Halaman sebelumnya"
                disabled={safeCurrentPage <= 1}
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
              >
                <Icon icon={commonIcons.chevronLeft} size={18} />
              </PageButton>

              {pageItems.map((pageItem, index) =>
                pageItem === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex h-9 min-w-9 items-center justify-center text-sm font-semibold text-grey"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                ) : (
                  <PageButton
                    key={pageItem}
                    isActive={pageItem === safeCurrentPage}
                    onClick={() => setCurrentPage(pageItem)}
                  >
                    {pageItem}
                  </PageButton>
                ),
              )}

              <PageButton
                label="Halaman seterusnya"
                disabled={safeCurrentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                <Icon icon={commonIcons.chevronRight} size={18} />
              </PageButton>
            </div>

            <p className="text-sm font-medium text-dark-grey">
              {hasHistory ? (
                <>
                  Menunjukkan{" "}
                  <strong>
                    {startIndex + 1}-{endIndex}
                  </strong>{" "}
                  Daripada {filteredHistory.length} Rekod
                </>
              ) : (
                "Tiada rekod untuk dipaparkan"
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function HistoryCell({
  value,
  isStrong = false,
  className = "text-dark-grey",
}: {
  value: string;
  isStrong?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`overflow-hidden text-ellipsis whitespace-nowrap px-6 py-5 align-middle text-base ${className} ${
        isStrong ? "font-extrabold" : ""
      }`}
      title={value}
    >
      {value}
    </td>
  );
}

function formatHistoryDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "ellipsis",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

function downloadHistoryExcel(
  unitDetails: QuarterUnitDetails,
  records: QuarterUnitOccupancyDetails[],
) {
  const headers: XlsxCell[] = [
    { value: "Tarikh Masuk", style: "header" },
    { value: "Tarikh Keluar", style: "header" },
    { value: "Nama Penghuni", style: "header" },
    { value: "No. Kad Pengenalan", style: "header", align: "center" },
    { value: "Status", style: "header", align: "center" },
  ];
  const rows: XlsxSheet["rows"] = records.map((occupancy) => [
    formatHistoryDate(occupancy.moveInDate),
    formatHistoryDate(occupancy.moveOutDate),
    occupancy.occupantName,
    { value: formatIcNumber(occupancy.occupantIcNumber), align: "center" },
    {
      value: occupancy.status === "CURRENT" ? "Aktif" : "Keluar",
      align: "center",
    },
  ]);

  downloadXlsxFile({
    filename: buildHistoryExportFilename(unitDetails.unitCode),
    sheets: [
      {
        name: "Sejarah Penghunian",
        columns: [
          { width: 16 },
          { width: 16 },
          { width: 34 },
          { width: 24 },
          { width: 14 },
        ],
        rows: [headers, ...rows],
      },
    ],
  });
}

function buildHistoryExportFilename(unitCode: string) {
  return ["sejarah-penghunian", sanitizeFilenamePart(unitCode)]
    .filter(Boolean)
    .join("-");
}

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
