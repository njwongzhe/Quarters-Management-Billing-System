"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import { commonIcons } from "@/app/components/Icon/Icon";
import FilterOption, {
  areAllFilterOptionsSelected,
  normalizeSelectedValuesForOptions,
} from "@/app/components/Filter/FilterOption";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";
import { downloadXlsxFile, type XlsxCell, type XlsxSheet } from "@/lib/download/xlsx-export";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import SearchBar, { SearchBarToggleButton, searchRecords, useSearchBarLogic } from "@/app/components/SearchBar";

import {
  RESIDENTS_PER_PAGE,
  type ExtractedTunggakanRecord,
} from "../../../../components/extract-review-shared";
import { getTunggakanRowKey } from "./helpers";
import TunggakanReviewRow from "./TunggakanReviewRow";

type TunggakanReviewTableProps = {
   records: ExtractedTunggakanRecord[];
   onRecordsChange?: (
     records: ExtractedTunggakanRecord[],
     totalAmount: string,
   ) => ExtractedTunggakanRecord | void | Promise<ExtractedTunggakanRecord | void>;
   selectedKeys?: string[];
   onSelectedKeysChange?: (keys: string[]) => void;
   parsingMode?: "strict" | "assisted";
   isLoading?: boolean;
   onFilteredStatsChange?: (stats: {
     recordCount?: number;
     totalAmount?: string;
     totalUnits?: number;
     categoryCount?: number;
   }) => void;
 };

type TunggakanFilter = "VALID" | "INVALID";

const filterOptions: Array<{
  value: TunggakanFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: "VALID", label: "Valid", dotColor: "bg-green" },
  { value: "INVALID", label: "Not Valid Data", dotColor: "bg-amber-500" },
];

const FILTER_LABELS: Record<TunggakanFilter, string> = {
  VALID: "Valid",
  INVALID: "Not Valid Data",
};

function getStatusFilterLabel(statuses: TunggakanFilter[]) {
  const normalizedStatuses = normalizeSelectedValuesForOptions(
    filterOptions,
    statuses,
  );
  const isAllSelected = areAllFilterOptionsSelected(
    filterOptions,
    normalizedStatuses,
  );

  if (isAllSelected) return "Semua Rekod";
  if (normalizedStatuses.length === 0) return "Tiada Rekod";

  return normalizedStatuses.map((s) => FILTER_LABELS[s]).join(", ");
}

export default function TunggakanReviewTable({
   records,
   onRecordsChange,
   selectedKeys = [],
   onSelectedKeysChange,
   parsingMode = "strict",
   isLoading = false,
   onFilteredStatsChange,
 }: TunggakanReviewTableProps) {
  const [savedRows, setSavedRows] = useState(records);
  const [draftRows, setDraftRows] = useState(records);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Search & Filter State
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<TunggakanFilter[]>(["VALID", "INVALID"]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    isOpen: isSearchOpen,
    isSearchActive: isSearchFilterActive,
    searchInputRef,
    handleToggleSearch,
    handleClearSearch,
  } = useSearchBarLogic({ value: filterQuery, onChange: setFilterQuery });

  const isStatusFilterActive = !areAllFilterOptionsSelected(filterOptions, selectedFilters);
  const isFilterButtonActive = isFilterMenuOpen || isStatusFilterActive;

  // Filtered Rows: search by name or IC, then apply status filter
  const filteredRows = useMemo(() => {
    const searched = searchRecords(
      savedRows,
      filterQuery,
      (row) => [row.nama, row.noKadPengenalan],
      { icSearch: true },
    );

    if (!isStatusFilterActive) return searched;

    return searched.filter((row) => {
      const rowStatus: TunggakanFilter = row.importStatus === "IGNORED" ? "INVALID" : "VALID";
      return selectedFilters.includes(rowStatus);
    });
  }, [savedRows, filterQuery, selectedFilters, isStatusFilterActive]);

  // Pagination Logic
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
  } = usePaginationLogic(filteredRows.length, RESIDENTS_PER_PAGE);

  const paginatedRows = useMemo(
    () => filteredRows.slice(startIndex, endIndex),
    [filteredRows, startIndex, endIndex],
  );

  const selectedKeySet = new Set(selectedKeys);
  const selectableRecordKeys = useMemo(
    () =>
      filteredRows
        .filter((row) => row.importStatus !== "IGNORED")
        .map(getTunggakanRowKey),
    [filteredRows],
  );
  const isAllSelected =
    selectableRecordKeys.length > 0 &&
    selectableRecordKeys.every((key) => selectedKeySet.has(key));

  useEffect(() => {
    setSavedRows(records);
    setDraftRows(records);
    setEditingKey(null);
  }, [records]);

  // Handle outside click to cancel editing
  useEffect(() => {
    if (!editingKey) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-tunggakan-editor='true']")) {
        return;
      }

      setDraftRows(savedRows);
      setEditingKey(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingKey, savedRows]);

  // Handle outside click to close filter menu
  useEffect(() => {
    if (!isFilterMenuOpen) {
      return;
    }

    function handlePointerDownOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (filterMenuRef.current?.contains(target)) {
        return;
      }
      setIsFilterMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, [isFilterMenuOpen]);

  useEffect(() => {
    onFilteredStatsChange?.({
      recordCount: filteredRows.length,
      totalAmount: filteredRows
        .filter((row) => row.importStatus !== "IGNORED")
        .reduce((total, row) => total + parseSignedAmount(row.jumlahTunggakan), 0)
        .toFixed(2),
    });
  }, [filteredRows, onFilteredStatsChange]);

  function handleToggleFilterMenu() {
    setIsFilterMenuOpen((currentState) => !currentState);
  }

  function handleSelectFilter(values: TunggakanFilter[]) {
    setSelectedFilters(values);
  }

  const handleDownload = () => {
    const headers: XlsxCell[] = [
      { value: "Nama Penghuni", style: "header" },
      { value: "No. Kad Pengenalan", style: "header" },
      { value: "Jumlah Tunggakan (RM)", style: "header", align: "right" },
      { value: "Status Data", style: "header", align: "center" },
      { value: "Mesej", style: "header" },
    ];

    const rows: XlsxSheet["rows"] = filteredRows.map((record) => [
      record.nama || "N/A",
      record.noKadPengenalan ? formatIcNumber(record.noKadPengenalan) : "N/A",
      { value: parseSignedAmount(record.jumlahTunggakan), type: "number", align: "right" },
      { value: record.importStatus === "IGNORED" ? "Tidak Sah" : "Sah", align: "center" },
      record.importMessage || "",
    ]);

    const filename = isSearchFilterActive || isStatusFilterActive
      ? `Tunggakan_Semakan_Ditapis_${new Date().toISOString().slice(0, 10)}`
      : `Tunggakan_Semakan_Semua_${new Date().toISOString().slice(0, 10)}`;

    downloadXlsxFile({
      filename,
      sheets: [
        {
          name: "Senarai Tunggakan",
          columns: [
            { width: 30 },
            { width: 24 },
            { width: 22 },
            { width: 16 },
            { width: 40 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  };

  const updateDraftField = (
    key: string,
    field: "nama" | "noKadPengenalan" | "jumlahTunggakan",
    value: string,
  ) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) =>
        getTunggakanRowKey(row) === key ? { ...row, [field]: value } : row,
      ),
    );
  };

  const persistRows = (rows: ExtractedTunggakanRecord[]) => {
    const totalAmount = rows
      .filter((row) => row.importStatus !== "IGNORED")
      .reduce((total, row) => total + parseSignedAmount(row.jumlahTunggakan), 0)
      .toFixed(2);

    return onRecordsChange?.(rows, totalAmount);
  };

  const saveRow = async (key: string) => {
    const draft = draftRows.find((row) => getTunggakanRowKey(row) === key);

    if (!draft) {
      setEditingKey(null);
      return;
    }

    const nextRows = savedRows.map((row) =>
      getTunggakanRowKey(row) === key ? { ...row, ...draft } : row,
    );

    try {
      const updatedRecord = await persistRows(nextRows);
      const committedRows = updatedRecord
        ? nextRows.map((row) =>
            getTunggakanRowKey(row) === key ? updatedRecord : row,
          )
        : nextRows;

      setSavedRows(committedRows);
      setDraftRows(committedRows);
      if (updatedRecord?.importStatus === "IGNORED") {
        const nextKeys = new Set(selectedKeys);
        nextKeys.delete(key);
        nextKeys.delete(getTunggakanRowKey(updatedRecord));
        onSelectedKeysChange?.([...nextKeys]);
      }
      setEditingKey(null);
    } catch {
      setEditingKey(key);
    }
  };

  const deleteRow = (key: string) => {
    const nextRows = savedRows.filter((row) => getTunggakanRowKey(row) !== key);

    setSavedRows(nextRows);
    setDraftRows((currentRows) =>
      currentRows.filter((row) => getTunggakanRowKey(row) !== key),
    );
    const nextKeys = new Set(selectedKeys);
    nextKeys.delete(key);
    onSelectedKeysChange?.([...nextKeys]);
    setEditingKey(null);
    persistRows(nextRows);
  };

  const startEdit = (key: string) => {
    const saved = savedRows.find((row) => getTunggakanRowKey(row) === key);

    if (saved) {
      setDraftRows((currentRows) =>
        currentRows.map((row) =>
          getTunggakanRowKey(row) === key ? { ...row, ...saved } : row,
        ),
      );
    }

    setEditingKey(key);
  };

  const toggleSelectedRow = (key: string, checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    if (checked) {
      nextKeys.add(key);
    } else {
      nextKeys.delete(key);
    }

    onSelectedKeysChange?.([...nextKeys]);
  };

  const toggleAllRows = (checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    selectableRecordKeys.forEach((key) => {
      if (checked) {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }
    });

    onSelectedKeysChange?.([...nextKeys]);
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      <div className="flex flex-col gap-3 px-3">
        <div className="flex flex-row justify-between pt-3">
          {/* Header */}
          <div>
            <div className="text-lg font-bold text-dark-grey">Pratinjau Data Tunggakan</div>
            <div className="text-xs text-grey">Sila semak maklumat sebelum pengesahan.</div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Toggle Button */}
            <SearchBarToggleButton
              label="Cari rekod tunggakan"
              isOpen={isSearchOpen}
              onToggle={handleToggleSearch}
            />

            {/* Filter Button */}
            <div ref={filterMenuRef} className="relative">
              <ToolbarButton
                icon={commonIcons.filter}
                label={`Tapis status data: ${getStatusFilterLabel(selectedFilters)}`}
                isActive={isFilterButtonActive}
                hasPopup="menu"
                isExpanded={isFilterMenuOpen}
                onClick={handleToggleFilterMenu}
              />

              {isFilterMenuOpen ? (
                <FilterOption<TunggakanFilter>
                  ariaLabel="Tapisan status data"
                  defaultLabel="Semua Rekod"
                  optionSets={[
                    {
                      title: "Status Rekod",
                      options: filterOptions,
                      selectedValues: selectedFilters,
                    },
                  ]}
                  onChange={(sets) => {
                    handleSelectFilter(sets[0]?.selectedValues ?? []);
                  }}
                />
              ) : null}
            </div>

            {/* Download Button */}
            <ToolbarButton
              icon={commonIcons.download}
              label="Muat turun data tunggakan"
              disabled={isLoading}
              onClick={handleDownload}
            />
          </div>
        </div>

        {/* Search Panel */}
        {isSearchOpen ? (
          <SearchBar
            value={filterQuery}
            onChange={setFilterQuery}
            onClear={handleClearSearch}
            label="CARIAN MENGIKUT NAMA ATAU NO. KAD PENGENALAN"
            placeholder="Contoh: Ahmad atau 950101-14-1234"
            inputRef={searchInputRef}
          />
        ) : null}
      </div>
      
      {/* Table: horizontal scroll on small screens */}
      <div className="rounded-lg overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-180 border-collapse text-left">
            {/* Table Header */}
            <thead className="bg-background">
              <tr className="font-bold text-xs text-grey bg-background">
                <th className="p-3 w-[0%] text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua rekod tunggakan"
                      checked={isAllSelected}
                      className="h-4 w-4 accent-dark-blue"
                      onChange={(event) => toggleAllRows(event.target.checked)}
                    />
                  </div>
                </th>
                <th className="p-3 text-left w-min whitespace-nowrap bg-background">Nama Penghuni</th>
                <th className="p-3 text-left w-min whitespace-nowrap bg-background">No. Kad Pengenalan</th>
                <th className="p-3 text-right w-min whitespace-nowrap bg-background">Jumlah Tunggakan (RM)</th>
                <th className="w-[0%] p-3 text-center whitespace-nowrap bg-background">Tindakan</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white">
              {/* Loading Animation */}
              {isLoading ? (
                loadingTableRows({
                  mode: "loading",
                  columnCount: 5,
                  rowCount: 10,
                })
              ) : paginatedRows.length === 0 ? (
                loadingTableRows({
                  mode: "message",
                  columnCount: 5,
                  rowCount: 1,
                  message: isSearchFilterActive || isStatusFilterActive
                    ? "Tiada rekod tunggakan yang sepadan dengan tapisan semasa."
                    : "Tiada rekod tunggakan ditemui.",
                })
              ) : (
                paginatedRows.map((resident) => {
                  const key = getTunggakanRowKey(resident);
                  const isEditing = editingKey === key;
                  const draft =
                    draftRows.find((row) => getTunggakanRowKey(row) === key) ??
                    resident;

                  return (
                    <TunggakanReviewRow
                      key={key}
                      row={resident}
                      draft={draft}
                      isEditing={isEditing}
                      isSelected={selectedKeySet.has(key)}
                      onSelectionChange={(checked) => toggleSelectedRow(key, checked)}
                      onDraftFieldChange={(field, value) =>
                        updateDraftField(key, field, value)
                      }
                      onSave={() => void saveRow(key)}
                      onDelete={() => deleteRow(key)}
                      onEdit={() => startEdit(key)}
                    />
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-light-grey/20 bg-white">
                <td colSpan={5} className="px-4 py-4 sm:px-5">
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

function parseSignedAmount(value: string) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return 0;
  }

  const normalizedSign = normalizedValue.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalizedSign);
  const hasNegativeSign = normalizedSign.includes("-");
  const numericValue = Number(
    normalizedSign
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return (isParenthesizedNegative || hasNegativeSign) && numericValue > 0
    ? numericValue * -1
    : numericValue;
}

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}
