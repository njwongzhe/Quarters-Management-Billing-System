"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Icon from "@/app/components/Icon/Icon";
import { InputField as SharedInputField } from "@/app/components/InputField";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import FilterDate from "@/app/components/Filter/FilterDate";
import type { ProcessingDraftSummary } from "./extract-review-shared";
import { formatDraftDateTime } from "./extract-review-shared";
import type { Category } from "./types";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";

const ITEMS_PER_PAGE = 10;

type ProcessingQueueTableProps = {
  activeCategory: Category;
  rows: ProcessingDraftSummary[];
  isLoading: boolean;
  onContinueDraft: (draft: ProcessingDraftSummary) => void;
  onDeleteDraft: (draftId: string) => void;
};

function getDraftIcon(draft: ProcessingDraftSummary) {
  return draft.fileName.toLowerCase().endsWith(".pdf")
    ? "picture_as_pdf"
    : "table";
}

function getDraftTone(draft: ProcessingDraftSummary) {
  return draft.fileName.toLowerCase().endsWith(".pdf") ? "red" : "green";
}

export default function ProcessingQueueTable({
  activeCategory,
  rows,
  isLoading,
  onContinueDraft,
  onDeleteDraft,
}: ProcessingQueueTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const [isDateOpen, setIsDateOpen] = useState(false);

  const datePanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Close DateFilter on clicking outside
  useEffect(() => {
    if (!isDateOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (target instanceof Element && target.closest("[data-filter-date-calendar]")) return;

      if (datePanelRef.current?.contains(target)) return;

      setIsDateOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isDateOpen]);

  // Focus search input when toggled open
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchOpen]);

  function handleToggleSearch() {
    if (isSearchOpen) {
      setSearchQuery("");
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
    }
  }

  function handleClearSearch() {
    setSearchQuery("");
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Search Query Filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          row.fileName.toLowerCase().includes(query) ||
          row.uploadedBy.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Date Filter
      if (dateFilter.startDate || dateFilter.endDate) {
        const rowTime = new Date(row.uploadedAt).getTime();

        if (dateFilter.startDate) {
          const start = new Date(`${dateFilter.startDate}T00:00:00`).getTime();
          if (rowTime < start) return false;
        }

        if (dateFilter.endDate) {
          const end = new Date(`${dateFilter.endDate}T23:59:59.999`).getTime();
          if (rowTime > end) return false;
        }
      }

      return true;
    });
  }, [rows, searchQuery, dateFilter]);

  const isDateActive = Boolean(dateFilter.startDate || dateFilter.endDate);

  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
  } = usePaginationLogic(filteredRows.length, ITEMS_PER_PAGE);

  const paginatedRows = useMemo(
    () => filteredRows.slice(startIndex, endIndex),
    [filteredRows, startIndex, endIndex],
  );

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      {/* Header section with Title, Badge, and Action Buttons */}
      <div className="flex items-center justify-between gap-4 px-3 mt-3">
        <div className="flex flex-col">
          {/* Header */}
            <div className="text-lg font-bold text-dark-grey">Barisan Pemprosesan</div>
            <div className="text-xs text-grey">Sila pilih document yang ingin disemak.</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Toggle Button */}
          <ToolbarIconButton
            icon="search"
            label="Cari fail"
            isActive={isSearchOpen || searchQuery.trim().length > 0}
            onClick={handleToggleSearch}
          />

          {/* Date Filter Button & Dropdown */}
          <div ref={datePanelRef} className="relative">
            <ToolbarIconButton
              icon="calendar_month"
              label="Tapis tarikh"
              isActive={isDateOpen || isDateActive}
              onClick={() => setIsDateOpen((prev) => !prev)}
            />

            {isDateOpen ? (
              <FilterDate
                title="Tarikh"
                description="Tapis tarikh dokumen dimuat naik."
                ariaLabel="Tapisan tarikh dokumen"
                value={dateFilter}
                onApply={(value) => {
                  setDateFilter(value);
                }}
                onClear={() => {
                  setDateFilter({ startDate: "", endDate: "" });
                  setIsDateOpen(false);
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Search Input Panel */}
      {isSearchOpen ? (
        <div className="px-3">
          <div className="rounded-xl border border-[#DCE2F1] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div ref={searchInputRef} className="flex-1">
                <SharedInputField
                  label="CARIAN MENGIKUT NAMA DOKUMEN ATAU PEMUAT NAIK"
                  value={searchQuery}
                  state="active"
                  onChange={setSearchQuery}
                  placeholder="Cth: bayaran.pdf atau Ahmad..."
                  showLabel
                  leadingIcon={
                    <Icon
                      icon="search"
                      size={18}
                      className="text-light-grey"
                    />
                  }
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
                  disabled={searchQuery.trim().length === 0}
                  onClick={handleClearSearch}
                >
                  Kosongkan
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto overflow-y-auto rounded-lg">
        <table className="w-full border-collapse text-left">
          <thead className="bg-background">
            <tr className="font-bold text-xs text-grey bg-background border-b border-light-grey/20">
              <th className="p-3 text-left whitespace-nowrap bg-background">Nama Dokumen</th>
              <th className="p-3 text-left whitespace-nowrap bg-background">Pemuat Naik</th>
              <th className="p-3 text-left whitespace-nowrap bg-background">Tarikh & Masa</th>
              <th className="w-[0%] p-3 text-center whitespace-nowrap bg-background">Tindakan</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              loadingTableRows({
                mode: "loading",
                columnCount: 4,
                rowCount: 10,
              })
            ) : rows.length === 0 ? (
              loadingTableRows({
                mode: "message",
                columnCount: 4,
                message: `Tiada fail ${activeCategory.toLowerCase()} sedang menunggu.`,
                rowCount: 1,
              })
            ) : filteredRows.length === 0 ? (
              loadingTableRows({
                mode: "message",
                columnCount: 4,
                message: "Tiada fail sepadan dengan carian atau penapis tarikh.",
                rowCount: 1,
              })
            ) : (
              paginatedRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-light-grey/20 transition-colors hover:bg-background/60 cursor-auto select-text"
                  onDoubleClick={() => onContinueDraft(row)}
                >
                  <td className="overflow-hidden text-sm font-semibold text-dark-grey px-3 py-2 text-left">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded",
                          getDraftTone(row) === "green"
                            ? "bg-[#EAF8EF] text-green"
                            : "bg-[#FFF0F0] text-red",
                        ].join(" ")}
                      >
                        <Icon
                          icon={getDraftIcon(row)}
                          size={16}
                          filled
                          weight={600}
                        />
                      </span>
                      <span className="truncate font-semibold text-dark-grey" title={row.fileName}>
                        {row.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="overflow-hidden text-sm font-semibold text-dark-grey px-3 py-2 text-left">
                    {row.uploadedBy}
                  </td>
                  <td className="overflow-hidden text-sm font-semibold text-dark-grey px-3 py-2 text-left">
                    {formatDraftDateTime(row.uploadedAt)}
                  </td>
                  <td className="w-[0%] px-3 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background text-dark-blue"
                        title="Lihat"
                        onClick={(e) => {
                          e.stopPropagation();
                          onContinueDraft(row);
                        }}
                      >
                        <Icon icon="visibility" size={18} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background text-red"
                        title="Padam"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDraft(row.id);
                        }}
                      >
                        <Icon icon="delete" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-light-grey/20 bg-white">
              <td colSpan={4} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalRecords={filteredRows.length}
                    onPageChange={handlePageChange}
                  />
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

