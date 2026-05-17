"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/Icon/ToolbarIconButton";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";
import { Topic } from "@/app/components/InputField";
import { downloadQuarterUnitOccupancyHistory } from "@/app/pages/7_kuarters/hooks/kuartersDownloads";

import type {
  QuarterUnitDetails,
  QuarterUnitOccupancyDetails,
} from "@/lib/quarter-units";

type KuartersUnitDetailsHistoryTabProps = {
  unitDetails: QuarterUnitDetails;
};
type HistoryFilter = "ALL" | QuarterUnitOccupancyDetails["status"];

const HISTORY_PAGE_SIZE = 10;

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

  const historyRecords = useMemo(() => {
    if (statusFilter === "ALL") {
      return unitDetails.occupancyHistory;
    }

    return unitDetails.occupancyHistory.filter(
      (occupancy) => occupancy.status === statusFilter,
    );
  }, [statusFilter, unitDetails.occupancyHistory]);

  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
    paginationItems,
  } = usePaginationLogic(historyRecords.length, HISTORY_PAGE_SIZE);

  const currentHistory = historyRecords.slice(startIndex, endIndex);

  useEffect(() => {
    handlePageChange("goto", 1);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <Topic content="SEJARAH PENGHUNIAN" />

        <div className="flex flex-row gap-4 items-center">
          <ToolbarButton
            icon={commonIcons.download}
            label="Muat turun sejarah penghunian"
            onClick={() =>
              downloadQuarterUnitOccupancyHistory(
                unitDetails.unitCode,
                historyRecords,
              )
            }
          />
          <div ref={filterMenuRef} className="relative">
            <ToolbarButton
              icon={commonIcons.filter}
              label={`Tapis sejarah penghunian: ${getFilterLabel(statusFilter)}`}
              isActive={isFilterMenuOpen || statusFilter !== "ALL"}
              onClick={() => setIsFilterMenuOpen((currentState) => !currentState)}
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

      <div className="rounded-lg overflow-hidden border border-light-grey/20">
        <table className="w-full overflow-x-auto">
          <thead>
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="text-left px-4 py-3">Tarikh Masuk</th>
              <th className="text-left px-4 py-3">Tarikh Keluar</th>
              <th className="text-left px-4 py-3">Nama Penghuni</th>
              <th className="text-center px-4 py-3">No. Kad Pengenalan</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentHistory.length === 0 ? (
              <tr className="text-sm">
                <td className="px-4 py-4 text-center text-grey" colSpan={5}>
                  Tiada rekod penghunian yang sepadan untuk unit ini.
                </td>
              </tr>
            ) : (
              currentHistory.map((occupancy) => (
                <tr
                  key={occupancy.id}
                  className="text-sm border-b border-b-light-grey/20 hover:bg-light-blue/50 transition-colors"
                >
                  <td className="px-4 py-3 text-left font-medium">
                    {formatHistoryDate(occupancy.moveInDate)}
                  </td>
                  <td className="px-4 py-3 text-left">
                    {formatHistoryDate(occupancy.moveOutDate)}
                  </td>
                  <td className="px-4 py-3 text-left">{occupancy.occupantName}</td>
                  <td className="px-4 py-3 text-center">
                    {formatIcNumber(occupancy.occupantIcNumber)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-semibold ${
                        occupancy.status === "CURRENT"
                          ? "border-aktif/20 bg-aktif/10 text-aktif"
                          : "border-x-layak/20 bg-x-layak/10 text-x-layak"
                      }`}
                    >
                      {occupancy.status === "CURRENT" ? "Aktif" : "Keluar"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={5} className="bg-white border-t border-light-grey/20 px-4 py-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalRecords={historyRecords.length}
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

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}
