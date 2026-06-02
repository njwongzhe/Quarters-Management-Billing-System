"use client";

import { useEffect } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { InputField as SharedInputField } from "@/app/components/InputField";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";
import { Topic } from "@/app/components/InputField";
import HistoryDownload from "./KuartersUnitHistoryTabComponents/HistoryDownload";
import { useHistoryFilterDate } from "./KuartersUnitHistoryTabComponents/HistoryFilterDate";
import { useHistoryFilter } from "./KuartersUnitHistoryTabComponents/HistoryFilter";
import { useHistorySearch } from "./KuartersUnitHistoryTabComponents/HistorySearch";

import type {
  QuarterUnitDetails,
} from "@/lib/quarters/quarter-units";

type KuartersUnitDetailsHistoryTabProps = {
  unitDetails: QuarterUnitDetails;
};

const HISTORY_PAGE_SIZE = 10;

export default function KuartersUnitDetailsHistoryTab({
  unitDetails,
}: KuartersUnitDetailsHistoryTabProps) {
  const {
    filteredRecords: statusFilteredRecords,
    statusFilterKey,
    FilterControl,
  } = useHistoryFilter(
    unitDetails.occupancyHistory,
  );
  const {
    filteredRecords: dateFilteredRecords,
    dateFilterKey,
    DateFilterControl,
  } = useHistoryFilterDate(statusFilteredRecords);
  const {
    filteredRecords: historyRecords,
    searchKey,
    searchInputRef,
    searchQuery,
    isSearchOpen,
    isSearchActive,
    setSearchQuery,
    handleClearSearch,
    SearchButton,
  } = useHistorySearch(dateFilteredRecords);

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
  }, [dateFilterKey, searchKey, statusFilterKey, unitDetails.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <Topic content="SEJARAH PENGHUNIAN" />

        <div className="flex flex-row gap-4 items-center">
          {SearchButton}
          {DateFilterControl}
          {FilterControl}
          <HistoryDownload unitCode={unitDetails.unitCode} records={historyRecords} />
        </div>
      </div>

      {isSearchOpen ? (
        <div className="w-full px-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div ref={searchInputRef} className="flex-1">
                <SharedInputField
                  label="CARIAN MENGIKUT NAMA ATAU NO. KP"
                  value={searchQuery}
                  state="active"
                  onChange={(value) => {
                    setSearchQuery(value);
                  }}
                  placeholder="Contoh: Ahmad atau 880101-14-5678"
                  showLabel
                  leadingIcon={(
                    <Icon
                      icon={commonIcons.search}
                      size={18}
                      className="text-light-grey"
                    />
                  )}
                  className="w-full"
                  activeBackgroundClass="bg-light-blue"
                  inputFontSize={12}
                  inputMinHeight={40}
                />
              </div>

              <div className="flex items-center gap-3 self-start lg:self-end">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!isSearchActive}
                  onClick={handleClearSearch}
                >
                  Kosongkan
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                  className="text-sm border-b border-b-light-grey/20 transition-colors"
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
                      className={`inline-flex items-center text-[11px] font-semibold ${
                        occupancy.status === "CURRENT"
                          ? "text-aktif"
                          : "text-x-layak"
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
