"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PatternFormat } from "react-number-format";

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
import GlobalFixedMessage from "@/app/components/Message/GlobalFixedMessage";
import type { GlobalFixedNotice } from "@/app/components/Message/GlobalFixedMessage";

import type { ExtractedPenghuniRecord } from "../../../../components/extract-review-shared";
import { getPenghuniRecordKey } from "./helpers";
import PenghuniReviewDetail from "./PenghuniReviewDetail";

const mainTextSize = "text-[12px]";
const subTextSize = "text-[11px]";
const ITEMS_PER_PAGE = 10;

type PenghuniFilter = "VALID" | "INVALID";

const filterOptions: Array<{
  value: PenghuniFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: "VALID", label: "Valid", dotColor: "bg-green" },
  { value: "INVALID", label: "Not Valid Data", dotColor: "bg-amber-500" },
];

const FILTER_LABELS: Record<PenghuniFilter, string> = {
  VALID: "Valid",
  INVALID: "Not Valid Data",
};

function getStatusFilterLabel(statuses: PenghuniFilter[]) {
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

type PenghuniReviewTableProps = {
  records: ExtractedPenghuniRecord[];
  onRecordsChange?: (
    records: ExtractedPenghuniRecord[],
  ) => ExtractedPenghuniRecord | void | Promise<ExtractedPenghuniRecord | void>;
  onRecordDelete?: (record: ExtractedPenghuniRecord) => void | Promise<void>;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  onNotice?: (tone: GlobalFixedNotice["tone"], message: string) => void;
  isLoading?: boolean;
  onFilteredStatsChange?: (stats: {
    recordCount?: number;
    totalAmount?: string;
    totalUnits?: number;
    categoryCount?: number;
  }) => void;
};

export default function PenghuniReviewTable({
  records,
  onRecordsChange,
  onRecordDelete,
  selectedKeys = [],
  onSelectedKeysChange,
  onNotice,
  isLoading = false,
  onFilteredStatsChange,
}: PenghuniReviewTableProps) {
  const [selectedResident, setSelectedResident] =
    useState<ExtractedPenghuniRecord | null>(null);
  const [notice, setNotice] = useState<GlobalFixedNotice | null>(null);

  // Search & Filter State
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<PenghuniFilter[]>(["VALID", "INVALID"]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  const isSearchFilterActive = filterQuery.trim().length > 0;
  const isStatusFilterActive = !areAllFilterOptionsSelected(filterOptions, selectedFilters);
  const isFilterButtonActive = isFilterMenuOpen || isStatusFilterActive;

  // Filtered rows
  const filteredRows = useMemo(() => {
    return records.filter((row) => {
      // 1. Search Query Filter
      if (filterQuery.trim()) {
        const query = filterQuery.toLowerCase().trim();
        const namaMatch = (row.nama || "").toLowerCase().includes(query);
        const icMatch = (row.noKadPengenalan || "").toLowerCase().includes(query);
        const kuartersMatch = (row.kuarters || "").toLowerCase().includes(query);
        const unitMatch = (row.unit || "").toLowerCase().includes(query);
        if (!namaMatch && !icMatch && !kuartersMatch && !unitMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (isStatusFilterActive) {
        const rowStatus: PenghuniFilter = row.isExisted ? "INVALID" : "VALID";
        if (!selectedFilters.includes(rowStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [records, filterQuery, selectedFilters, isStatusFilterActive]);

  // Pagination
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

  // Selection
  const selectedKeySet = new Set(selectedKeys);
  const selectableRecordKeys = useMemo(
    () =>
      filteredRows
        .filter((record) => !record.isExisted)
        .map(getPenghuniRecordKey),
    [filteredRows],
  );
  const isAllSelected =
    selectableRecordKeys.length > 0 &&
    selectableRecordKeys.every((key) => selectedKeySet.has(key));

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
    if (isSearchOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    onFilteredStatsChange?.({
      recordCount: filteredRows.length,
    });
  }, [filteredRows, onFilteredStatsChange]);

  const showNotice = (tone: GlobalFixedNotice["tone"], message: string) => {
    if (!onNotice) {
      setNotice({ tone, message });
    }
    onNotice?.(tone, message);
  };

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

  function handleSelectFilter(values: PenghuniFilter[]) {
    setSelectedFilters(values);
  }

  const handleDownload = () => {
    const headers: XlsxCell[] = [
      { value: "Nama Penghuni", style: "header" },
      { value: "No. Kad Pengenalan", style: "header" },
      { value: "No. Telefon", style: "header" },
      { value: "Gmail", style: "header" },
      { value: "Jawatan", style: "header" },
      { value: "Jabatan", style: "header" },
      { value: "Taraf Perkhidmatan", style: "header" },
      { value: "Kuarters", style: "header" },
      { value: "Unit", style: "header" },
      { value: "Alamat Kuarters", style: "header" },
      { value: "Status Data", style: "header", align: "center" },
    ];

    const rows: XlsxSheet["rows"] = filteredRows.map((record) => [
      record.nama || "N/A",
      record.noKadPengenalan ? formatIcNumber(record.noKadPengenalan) : "N/A",
      record.perhubungan || "N/A",
      record.gmail || "N/A",
      record.pekerjaan || "N/A",
      record.jabatan || "N/A",
      record.tarafPerkhidmatan || "N/A",
      record.kuarters || "N/A",
      record.unit || "N/A",
      record.alamatKuarters || "N/A",
      { value: record.isExisted ? "Sedia Ada" : "Baharu", align: "center" },
    ]);

    const filename = isSearchFilterActive || isStatusFilterActive
      ? `Penghuni_Semakan_Ditapis_${new Date().toISOString().slice(0, 10)}`
      : `Penghuni_Semakan_Semua_${new Date().toISOString().slice(0, 10)}`;

    downloadXlsxFile({
      filename,
      sheets: [
        {
          name: "Senarai Penghuni",
          columns: [
            { width: 30 },
            { width: 24 },
            { width: 18 },
            { width: 26 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 16 },
            { width: 30 },
            { width: 16 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
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

  const saveResident = async (updatedResident: ExtractedPenghuniRecord) => {
    const updatedResidentKey = getPenghuniRecordKey(updatedResident);
    const updatedIc = normalizeIc(updatedResident.noKadPengenalan);
    const duplicateRecord = records.find(
      (record) =>
        getPenghuniRecordKey(record) !== updatedResidentKey &&
        normalizeIc(record.noKadPengenalan) === updatedIc,
    );

    if (duplicateRecord) {
      showNotice(
        "error",
        `No. K/P ${updatedResident.noKadPengenalan} telah wujud dalam dokumen ini.`,
      );
      throw new Error(`No. K/P ${updatedResident.noKadPengenalan} telah wujud dalam dokumen ini.`);
    }

    const updatedRecords = records.map((record) =>
      getPenghuniRecordKey(record) === updatedResidentKey
        ? updatedResident
        : record,
    );

    const savedResident = await onRecordsChange?.(updatedRecords);
    setSelectedResident(savedResident ?? updatedResident);
    if (!onNotice) {
      showNotice("success", "Rekod penghuni berjaya dikemas kini.");
    }
  };

  const deleteResident = async (resident: ExtractedPenghuniRecord) => {
    const residentKey = getPenghuniRecordKey(resident);

    if (onRecordDelete) {
      await onRecordDelete(resident);
    } else {
      const nextRecords = records.filter(
        (record) => getPenghuniRecordKey(record) !== residentKey,
      );
      await onRecordsChange?.(nextRecords);
      showNotice("success", "Rekod penghuni berjaya dipadam.");
    }

    onSelectedKeysChange?.(selectedKeys.filter((key) => key !== residentKey));
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      <div className="flex flex-row justify-between px-3 pt-3">
        {/* Header */}
        <div>
          <div className="text-lg font-bold text-dark-grey">Pratinjau Data Penghuni</div>
          <div className="text-xs text-grey">Sila semak maklumat sebelum pengesahan.</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Button */}
          <ToolbarButton
            icon={commonIcons.search}
            label="Cari rekod penghuni"
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
              <FilterOption<PenghuniFilter>
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
            label="Muat turun data penghuni"
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
                    label="CARIAN MENGIKUT NAMA, NO. KAD PENGENALAN, KUARTERS ATAU UNIT"
                    value={filterQuery}
                    state="active"
                    onChange={setFilterQuery}
                    placeholder="Contoh: Ahmad, 950101-14-1234, atau Unit A-01-05"
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
        <table className="w-full">
          <thead>
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="p-3 w-[0%] text-center bg-background">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua rekod penghuni"
                    checked={isAllSelected}
                    disabled={selectableRecordKeys.length === 0}
                    className="h-4 w-4 accent-dark-blue"
                    onChange={(event) => toggleAllRows(event.target.checked)}
                  />
                </div>
              </th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Penghuni</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Perhubungan</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Pekerjaan</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Taraf Perkhidmatan</th>
              <th className="p-3 text-left w-min whitespace-nowrap bg-background">Kuarters</th>
              <th className="w-[0%] p-3 text-center whitespace-nowrap bg-background">Tindakan</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              loadingTableRows({
                mode: "loading",
                columnCount: 7,
                rowCount: 10,
              })
            ) : paginatedRows.length === 0 ? (
              <tr className="border-t border-light-grey/20">
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-sm font-medium text-grey"
                >
                  {isSearchFilterActive || isStatusFilterActive
                    ? "Tiada rekod penghuni yang sepadan dengan tapisan semasa."
                    : "Tiada rekod penghuni baharu ditemui."}
                </td>
              </tr>
            ) : (
              paginatedRows.map((resident) => {
                const recordKey = getPenghuniRecordKey(resident);
                const isSelectable = !resident.isExisted;

                return (
                  <tr
                    key={recordKey}
                    className={[
                      "border-t border-light-grey/20 transition-colors",
                      resident.isExisted
                        ? "bg-amber-50"
                        : "hover:bg-background/60",
                    ].join(" ")}
                  >
                    {/* Checkbox */}
                    <td className="w-10 whitespace-nowrap px-3 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelectable && selectedKeySet.has(recordKey)}
                          disabled={!isSelectable}
                          className="h-4 w-4 accent-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                          onChange={(event) =>
                            isSelectable
                              ? toggleSelectedRow(recordKey, event.target.checked)
                              : undefined
                          }
                        />
                      </div>
                    </td>

                    {/* Penghuni */}
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>{resident.nama}</div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        <PatternFormat
                          value={resident.noKadPengenalan}
                          format="######-##-####"
                          displayType="text"
                        />
                      </div>
                      {resident.isExisted ? (
                        <p className="mt-1 text-[10px] font-semibold text-[#B54708]">
                          Rekod penghuni ini telah wujud dalam sistem.
                        </p>
                      ) : null}
                    </td>

                    {/* Perhubungan */}
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.perhubungan ? (
                          <PatternFormat
                            value={resident.perhubungan}
                            format="###-#### ####"
                            displayType="text"
                          />
                        ) : (
                          "N/A"
                        )}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {resident.gmail || "N/A"}
                      </div>
                    </td>

                    {/* Pekerjaan */}
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.pekerjaan || "N/A"}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {resident.jabatan || "N/A"}
                      </div>
                    </td>

                    {/* Taraf Perkhidmatan */}
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.tarafPerkhidmatan || "N/A"}
                      </div>
                    </td>

                    {/* Kuarters */}
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.kuarters || "N/A"}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {formatQuarterAddress(resident)}
                      </div>
                    </td>

                    {/* Tindakan */}
                    <td className="px-3 py-2 text-center align-middle w-min whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label={`Lihat butiran ${resident.nama}`}
                          title={`Lihat butiran ${resident.nama}`}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-dark-blue transition-colors hover:bg-background"
                          onClick={() => setSelectedResident(resident)}
                        >
                          <Icon icon="eye" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-light-grey/20 bg-white">
              <td colSpan={7} className="px-4 py-4 sm:px-5">
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

      {selectedResident ? (
        <PenghuniReviewDetail
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
          onSave={saveResident}
          onDelete={deleteResident}
          onNotice={showNotice}
        />
      ) : null}
      {!onNotice ? (
        <GlobalFixedMessage notice={notice} onDismiss={() => setNotice(null)} />
      ) : null}
    </section>
  );
}

function formatQuarterAddress(resident: ExtractedPenghuniRecord) {
  if (resident.unit && resident.alamatKuarters) {
    return `${resident.unit}, ${resident.alamatKuarters}`;
  }

  return resident.unit || resident.alamatKuarters || "N/A";
}

function normalizeIc(value: string) {
  return value.replace(/\D/g, "");
}

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}
