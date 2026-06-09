"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import FilterOption, {
  areAllFilterOptionsSelected,
  normalizeSelectedValuesForOptions,
} from "@/app/components/Filter/FilterOption";
import {
  InputField as SharedInputField,
} from "@/app/components/InputField";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";
import { downloadXlsxFile, type XlsxCell, type XlsxSheet } from "@/lib/download/xlsx-export";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";

import {
  type ExtractedBayaranRecord,
  RESIDENTS_PER_PAGE,
} from "../../../../components/extract-review-shared";
import BayaranDeleteDialog from "./BayaranDeleteDialog";
import BayaranReviewRow from "./BayaranReviewRow";
import type { BayaranReviewRowModel } from "./types";

type BayaranReviewTableProps = {
  records: ExtractedBayaranRecord[];
  onTotalAmountChange?: (totalAmount: string) => void;
  onRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => ExtractedBayaranRecord | void | Promise<ExtractedBayaranRecord | void>;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  isLoading?: boolean;
  onFilteredStatsChange?: (stats: {
    recordCount?: number;
    totalAmount?: string;
    totalUnits?: number;
    categoryCount?: number;
  }) => void;
};

type BayaranFilter = "VALID" | "INVALID";

const filterOptions: Array<{
  value: BayaranFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: "VALID", label: "Valid", dotColor: "bg-green" },
  { value: "INVALID", label: "Not Valid Data", dotColor: "bg-amber-500" },
];

const FILTER_LABELS: Record<BayaranFilter, string> = {
  VALID: "Valid",
  INVALID: "Not Valid Data",
};

function getStatusFilterLabel(statuses: BayaranFilter[]) {
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

export default function BayaranReviewTable({
  records,
  onTotalAmountChange,
  onRecordsChange,
  selectedKeys = [],
  onSelectedKeysChange,
  isLoading = false,
  onFilteredStatsChange,
}: BayaranReviewTableProps) {
  const initialRows = useMemo(
    () =>
      records.map((record, index) => ({
        ...record,
        catatan: record.catatan || "bayaran",
        id: record.paymentId ?? `${record.page}-${record.bil}-${record.noGajiNoKp}-${index}`,
      })),
    [records],
  );

  const [savedRows, setSavedRows] = useState(initialRows);
  const [draftRows, setDraftRows] = useState(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Search & Filter State
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<BayaranFilter[]>(["VALID", "INVALID"]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  const isSearchFilterActive = filterQuery.trim().length > 0;
  const isStatusFilterActive = !areAllFilterOptionsSelected(filterOptions, selectedFilters);
  const isFilterButtonActive = isFilterMenuOpen || isStatusFilterActive;

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return savedRows.filter((row) => {
      // 1. Search Query Filter
      if (filterQuery.trim()) {
        const query = filterQuery.toLowerCase().trim();
        const namaMatch = (row.nama || "").toLowerCase().includes(query);
        const icMatch = (row.noGajiNoKp || "").toLowerCase().includes(query);
        if (!namaMatch && !icMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (isStatusFilterActive) {
        const rowStatus: BayaranFilter = row.isExisted ? "INVALID" : "VALID";
        if (!selectedFilters.includes(rowStatus)) {
          return false;
        }
      }

      return true;
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
        .filter((row) => !row.isExisted)
        .map(getBayaranRecordKey),
    [filteredRows],
  );
  const isAllSelected =
    selectableRecordKeys.length > 0 &&
    selectableRecordKeys.every((key) => selectedKeySet.has(key));

  useEffect(() => {
    setSavedRows(initialRows);
    setDraftRows(initialRows);
    setEditingId(null);
  }, [initialRows]);

  // Handle outside click to cancel editing
  useEffect(() => {
    if (!editingId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-bayaran-editor='true']")) {
        return;
      }

      setDraftRows(savedRows);
      setEditingId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingId, savedRows]);

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

  // Auto-focus search input when opened
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchOpen]);

  function handleToggleSearch() {
    if (isSearchOpen) {
      setFilterQuery("");
      setIsSearchOpen(false);
      return;
    }
    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    setFilterQuery("");
    setIsSearchOpen(false);
  }

  function handleToggleFilterMenu() {
    setIsFilterMenuOpen((currentState) => !currentState);
  }

  function handleSelectFilter(values: BayaranFilter[]) {
    setSelectedFilters(values);
  }

  const handleDownload = () => {
    const headers: XlsxCell[] = [
      { value: "Nama Penghuni", style: "header" },
      { value: "No. Kad Pengenalan", style: "header" },
      { value: "Nama Jabatan", style: "header" },
      { value: "No. Rujukan", style: "header" },
      { value: "Catatan", style: "header" },
      { value: "Amaun Bayar (RM)", style: "header", align: "right" },
      { value: "Status Data", style: "header", align: "center" },
    ];

    const rows: XlsxSheet["rows"] = filteredRows.map((record) => [
      record.nama || "N/A",
      record.noGajiNoKp ? formatIcNumber(record.noGajiNoKp) : "N/A",
      record.jabatanName || "N/A",
      record.noRujukan || "N/A",
      record.catatan || "N/A",
      { value: parseAmount(record.amaunRm), type: "number", align: "right" },
      { value: record.isExisted ? "Tidak Sah" : "Sah", align: "center" },
    ]);

    const filename = isSearchFilterActive || isStatusFilterActive
      ? `Bayaran_Semakan_Ditapis_${new Date().toISOString().slice(0, 10)}`
      : `Bayaran_Semakan_Semua_${new Date().toISOString().slice(0, 10)}`;

    downloadXlsxFile({
      filename,
      sheets: [
        {
          name: "Senarai Bayaran",
          columns: [
            { width: 30 },
            { width: 24 },
            { width: 26 },
            { width: 20 },
            { width: 20 },
            { width: 22 },
            { width: 16 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  };

  const calculateTotalAmount = (rows: BayaranReviewRowModel[]) =>
    rows.reduce((total, row) => total + (Number(row.amaunRm) || 0), 0).toFixed(2);

  useEffect(() => {
    onFilteredStatsChange?.({
      recordCount: filteredRows.length,
      totalAmount: calculateTotalAmount(filteredRows),
    });
  }, [filteredRows, onFilteredStatsChange]);

  const stripRowIds = (rows: BayaranReviewRowModel[]): ExtractedBayaranRecord[] =>
    rows.map((row) => ({
      paymentId: row.paymentId,
      residentId: row.residentId,
      isExisted: row.isExisted,
      page: row.page,
      jabatanCode: row.jabatanCode,
      jabatanName: row.jabatanName,
      ptjpkCode: row.ptjpkCode,
      ptjpkName: row.ptjpkName,
      bil: row.bil,
      noRujukan: row.noRujukan,
      noGajiNoKp: row.noGajiNoKp,
      nama: row.nama,
      amaunRm: row.amaunRm,
      tarikh: row.tarikh,
      noResit: row.noResit,
      catatan: row.catatan,
    }));

  const updateDraft = (
    id: string,
    field:
      | "nama"
      | "noGajiNoKp"
      | "jabatanName"
      | "noRujukan"
      | "tarikh"
      | "amaunRm"
      | "catatan",
    value: string,
  ) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const saveRow = async (id: string) => {
    const draft = draftRows.find((row) => row.id === id);

    if (!draft) {
      setEditingId(null);
      return;
    }

    const nextRows = savedRows.map((row) =>
      row.id === id ? { ...row, ...draft } : row,
    );
    const totalAmount = calculateTotalAmount(nextRows);

    try {
      const updatedRecord = await onRecordsChange?.(stripRowIds(nextRows), totalAmount);
      const committedRows = updatedRecord
        ? nextRows.map((row) =>
            row.id === id ? { ...row, ...updatedRecord } : row,
          )
        : nextRows;
      const committedTotalAmount = calculateTotalAmount(committedRows);

      onTotalAmountChange?.(committedTotalAmount);
      setSavedRows(committedRows);
      setDraftRows(committedRows);

      if (updatedRecord?.isExisted) {
        const nextKeys = new Set(selectedKeys);
        nextKeys.delete(getBayaranRecordKey(updatedRecord));
        onSelectedKeysChange?.([...nextKeys]);
      }
      setEditingId(null);
    } catch {
      setEditingId(id);
    }
  };

  const confirmDeleteRow = () => {
    if (!pendingDeleteId) {
      return;
    }

    const id = pendingDeleteId;
    setSavedRows((currentRows) => {
      const nextRows = currentRows.filter((row) => row.id !== id);
      const totalAmount = calculateTotalAmount(nextRows);
      onTotalAmountChange?.(totalAmount);
      onRecordsChange?.(stripRowIds(nextRows), totalAmount);
      return nextRows;
    });
    setDraftRows((currentRows) => currentRows.filter((row) => row.id !== id));
    
    // Also remove from selection keys
    const rowToDelete = savedRows.find((r) => r.id === id);
    if (rowToDelete) {
      const selectionKey = getBayaranRecordKey(rowToDelete);
      const nextKeys = new Set(selectedKeys);
      nextKeys.delete(selectionKey);
      onSelectedKeysChange?.([...nextKeys]);
    }

    setEditingId((currentId) => (currentId === id ? null : currentId));
    setPendingDeleteId(null);
  };

  const startEdit = (id: string) => {
    const saved = savedRows.find((row) => row.id === id);

    if (saved) {
      setDraftRows((currentRows) =>
        currentRows.map((row) => (row.id === id ? { ...row, ...saved } : row)),
      );
    }

    setEditingId(id);
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

  const pendingDeleteRow =
    savedRows.find((row) => row.id === pendingDeleteId) ?? null;

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      <div className="flex flex-row justify-between px-3 pt-3">
        {/* Header */}
        <div>
          <div className="text-lg font-bold text-dark-grey">Pratinjau Data Bayaran</div>
          <div className="text-xs text-grey">Sila semak maklumat sebelum pengesahan.</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Button */}
          <ToolbarButton
            icon={commonIcons.search}
            label="Cari rekod bayaran"
            isActive={isSearchOpen}
            onClick={handleToggleSearch}
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
              <FilterOption<BayaranFilter>
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
            label="Muat turun data bayaran"
            disabled={isLoading}
            onClick={handleDownload}
          />
        </div>
      </div>

      {isSearchOpen ? (
        <div className="px-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div ref={searchInputRef} className="flex-1">
                  <SharedInputField
                    label="CARIAN MENGIKUT NAMA ATAU NO. KAD PENGENALAN"
                    value={filterQuery}
                    state="active"
                    onChange={setFilterQuery}
                    placeholder="Contoh: Ahmad atau 950101-14-1234"
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
                    disabled={!isSearchFilterActive}
                    onClick={handleClearSearch}
                  >
                    Kosongkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-220 border-collapse text-left">
          <thead className="bg-background">
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="p-3 w-[0%] text-center bg-background">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua rekod bayaran"
                    checked={isAllSelected}
                    className="h-4 w-4 accent-dark-blue"
                    onChange={(event) => toggleAllRows(event.target.checked)}
                  />
                </div>
              </th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Nama Penghuni</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">No. Kad Pengenalan</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Nama Jabatan</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">No. Rujukan</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Catatan</th>
              <th className="p-3 text-right w-min whitespace-nowrap bg-background">Amaun Bayar (RM)</th>
              <th className="w-[0%] p-3 text-center whitespace-nowrap bg-background">Tindakan</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              loadingTableRows({
                mode: "loading",
                columnCount: 8,
                rowCount: 10,
              })
            ) : paginatedRows.length === 0 ? (
              <tr className="border-t border-light-grey/20">
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-sm font-medium text-grey"
                >
                  {isSearchFilterActive || isStatusFilterActive
                    ? "Tiada rekod bayaran yang sepadan dengan tapisan semasa."
                    : "Tiada rekod bayaran ditemui."}
                </td>
              </tr>
            ) : (
              paginatedRows.map((resident) => {
                const isEditing = editingId === resident.id;
                const draft = draftRows.find((row) => row.id === resident.id) ?? resident;
                const selectionKey = getBayaranRecordKey(resident);

                return (
                  <BayaranReviewRow
                    key={resident.id}
                    row={resident}
                    draft={draft}
                    isEditing={isEditing}
                    isSelected={selectedKeySet.has(selectionKey)}
                    onSelectionChange={(checked) =>
                      toggleSelectedRow(selectionKey, checked)
                    }
                    onDraftChange={(field, value) =>
                      updateDraft(resident.id, field, value)
                    }
                    onSave={() => void saveRow(resident.id)}
                    onEdit={() => startEdit(resident.id)}
                    onDelete={() => setPendingDeleteId(resident.id)}
                  />
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-light-grey/20 bg-white">
              <td colSpan={8} className="px-4 py-4 sm:px-5">
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

      <BayaranDeleteDialog
        row={pendingDeleteRow}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDeleteRow}
      />
    </section>
  );
}

function getBayaranRecordKey(record: ExtractedBayaranRecord) {
  return (
    record.paymentId ??
    `${record.page}-${record.bil}-${record.noGajiNoKp}-${record.noRujukan}`
  );
}

function parseAmount(value: string) {
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
