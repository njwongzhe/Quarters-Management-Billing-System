"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  InputField as SharedInputField,
  TableInputField,
  TablePickerField,
} from "@/app/components/InputField";
import FilterOption, {
  areAllFilterOptionsSelected,
  normalizeSelectedValuesForOptions,
} from "@/app/components/FIlter/FilterOption";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import { PaginationControls } from "@/app/components/Pagination/Pagination";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import { downloadQuarterUnits } from "@/app/pages/7_kuarters/hooks/kuartersDownloads";
import KuartersUnitDatePicker from "./KuartersUnitDatePicker";
import type { QuarterUnitOccupancyDetails } from "@/lib/quarters/quarter-units";

import type {
  KuartersUnitEditorState,
  QuarterUnitDraft,
  QuarterUnitRecord,
  QuarterUnitStatusFilter,
} from "./kuartersUnitHelpers";
import {
  EMPTY_QUARTER_UNIT_ID,
  formatQuarterUnitValue,
} from "./kuartersUnitHelpers";
import KuartersUnitDetailsOverlay from "./KuartersUnitDetailsOverlay";

type UnitOccupancyHistoryState = {
  unitId: string;
  records: QuarterUnitOccupancyDetails[];
} | null;

type KuartersUnitsPanelProps = {
  units: QuarterUnitRecord[];
  exportUnits: QuarterUnitRecord[];
  isLoading: boolean;
  categoryId: string;
  categoryName: string;
  address: string | null;
  currentPage: number;
  editor: KuartersUnitEditorState | null;
  filterQuery: string;
  targetUnitId?: string;
  statusFilter: QuarterUnitStatusFilter[];
  hasActiveFilters: boolean;
  isResidentPickerOpen: boolean;
  paginationItems: (number | "ellipsis")[];
  pendingAction: "save" | "delete" | null;
  pendingUnitId: string | null;
  startIndex: number;
  endIndex: number;
  totalRecords: number;
  totalPages: number;
  onAddUnit: () => void;
  onCancelEdit: () => void;
  onDeleteUnit: (rowId: string) => void;
  onDraftChange: (field: keyof QuarterUnitDraft, value: string) => void;
  onEditUnit: (unit: QuarterUnitRecord) => void;
  onFilterQueryChange: (value: string) => void;
  onRequestAssignResident: (unit: QuarterUnitRecord) => void;
  onStatusFilterChange: (values: QuarterUnitStatusFilter[]) => void;
  onOpenResidentPicker: () => void;
  onPageChange: (page: number) => void;
  onSaveUnit: () => void;
  onUnavailableFeature: (message: string) => void;
};

function ActionButton({
  icon,
  label,
  onClick,
  textClass,
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  textClass: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40 ${textClass}`}
      aria-label={label}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      <Icon icon={icon} size={18} />
    </button>
  );
}

function getRowAccentClass(status: QuarterUnitRecord["status"]) {
  return status === "OCCUPIED"
    ? "border-l-4 border-l-green"
    : "border-l-4 border-l-pencen-datang";
}

const STATUS_LABELS: Record<QuarterUnitStatusFilter, string> = {
  OCCUPIED: "Didiami",
  VACANT: "Kosong",
};

function getStatusFilterLabel(statuses: QuarterUnitStatusFilter[]) {
  const normalizedStatuses = normalizeSelectedValuesForOptions(
    statusFilterOptions,
    statuses,
  );
  const isAllSelected = areAllFilterOptionsSelected(
    statusFilterOptions,
    normalizedStatuses,
  );

  if (isAllSelected) return "Semua Status";
  if (normalizedStatuses.length === 0) return "Tiada Status";

  return normalizedStatuses.map((s) => STATUS_LABELS[s]).join(", ");
}

const statusFilterOptions: Array<{
  value: QuarterUnitStatusFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: "OCCUPIED", label: "Didiami", dotColor: "bg-green" },
  { value: "VACANT", label: "Kosong", dotColor: "bg-pencen-datang" },
];

export default function KuartersUnitsPanel({
  units,
  exportUnits,
  isLoading,
  categoryId,
  categoryName,
  address,
  currentPage,
  editor,
  filterQuery,
  targetUnitId = "",
  statusFilter,
  hasActiveFilters,
  isResidentPickerOpen,
  onAddUnit,
  onCancelEdit,
  onDeleteUnit,
  onDraftChange,
  onEditUnit,
  onFilterQueryChange,
  onRequestAssignResident,
  onStatusFilterChange,
  onOpenResidentPicker,
  onPageChange,
  onSaveUnit,
  onUnavailableFeature,
  paginationItems,
  pendingAction,
  pendingUnitId,
  startIndex,
  endIndex,
  totalRecords,
  totalPages,
}: KuartersUnitsPanelProps) {
  const isCreateRowVisible = editor?.mode === "create";
  const editingRowRef = useRef<HTMLTableRowElement | null>(null);
  const targetUnitRowRef = useRef<HTMLTableRowElement | null>(null);
  const lastScrolledTargetUnitIdRef = useRef<string | null>(null);
  const [unitOccupancyHistory, setUnitOccupancyHistory] =
    useState<UnitOccupancyHistoryState>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(
    filterQuery.trim().length > 0,
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const isSearchFilterActive = filterQuery.trim().length > 0;
  const isStatusFilterActive = !areAllFilterOptionsSelected(
    statusFilterOptions,
    statusFilter,
  );
  const isFilterButtonActive = isFilterMenuOpen || isStatusFilterActive;
  useEffect(() => {
    if (editor?.mode !== "edit") {
      return;
    }

    const unitId = editor.rowId;
    const controller = new AbortController();

    fetch(`/api/quarter-categories/${categoryId}/units/${unitId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((payload: { success: boolean; data?: { unit?: { occupancyHistory?: QuarterUnitOccupancyDetails[] } } }) => {
        if (payload.success && payload.data?.unit?.occupancyHistory) {
          setUnitOccupancyHistory({
            unitId,
            records: payload.data.unit.occupancyHistory,
          });
        } else {
          setUnitOccupancyHistory({
            unitId,
            records: [],
          });
        }
      })
      .catch(() => { /* aborted or failed — silently keep previous state */ });

    return () => { controller.abort(); };
  }, [categoryId, editor?.mode, editor?.rowId]);

  const handlePointerDownOutsideEditor = useEffectEvent((event: PointerEvent) => {
    if (!editor || pendingAction || isResidentPickerOpen) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (editingRowRef.current?.contains(target)) {
      return;
    }

    const datePickerPortal = document.querySelector("[data-kuarters-date-picker='true']");
    if (datePickerPortal?.contains(target)) {
      return;
    }

    onCancelEdit();
  });

  const handlePointerDownOutsideFilterMenu = useEffectEvent(
    (event: PointerEvent) => {
      if (!isFilterMenuOpen) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (filterMenuRef.current?.contains(target)) {
        return;
      }

      setIsFilterMenuOpen(false);
    },
  );

  useEffect(() => {
    if (!editor || pendingAction || isResidentPickerOpen) {
      return;
    }

    document.addEventListener("pointerdown", handlePointerDownOutsideEditor);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDownOutsideEditor,
      );
    };
  }, [editor, pendingAction, isResidentPickerOpen]);

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return;
    }

    document.addEventListener("pointerdown", handlePointerDownOutsideFilterMenu);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDownOutsideFilterMenu,
      );
    };
  }, [isFilterMenuOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!targetUnitId || isLoading) {
      return;
    }

    const targetRow = targetUnitRowRef.current;

    if (!targetRow || lastScrolledTargetUnitIdRef.current === targetUnitId) {
      return;
    }

    lastScrolledTargetUnitIdRef.current = targetUnitId;
    window.setTimeout(() => {
      targetRow.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }, [isLoading, targetUnitId, units]);

  function renderActionCell(unit: QuarterUnitRecord, isEditing: boolean) {
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <ActionButton
            icon={commonIcons.save}
            label={`Simpan ${unit.unitCode}`}
            disabled={Boolean(pendingAction)}
            onClick={onSaveUnit}
            textClass="text-green"
          />
          <ActionButton
            icon={commonIcons.delete}
            label={`Padam ${unit.unitCode}`}
            disabled={Boolean(pendingAction)}
            onClick={() => onDeleteUnit(unit.id)}
            textClass="text-red"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <ActionButton
          icon={commonIcons.edit}
          label={`Kemaskini ${unit.unitCode}`}
          disabled={Boolean(pendingAction)}
          onClick={() => onEditUnit(unit)}
          textClass="text-grey"
        />
        <ActionButton
          icon={commonIcons.eye}
          label={`Lihat ${unit.unitCode}`}
          disabled={Boolean(pendingAction)}
          onClick={() => setSelectedUnitId(unit.id)}
          textClass="text-dark-blue"
        />
      </div>
    );
  }

  function renderCreateActionCell() {
    return (
      <div className="flex items-center gap-1">
        <ActionButton
          icon={commonIcons.save}
          label="Simpan unit baharu"
          disabled={Boolean(pendingAction)}
          onClick={onSaveUnit}
          textClass="text-green"
        />
        <ActionButton
          icon={commonIcons.delete}
          label="Buang unit baharu"
          disabled={Boolean(pendingAction)}
          onClick={() => onDeleteUnit(EMPTY_QUARTER_UNIT_ID)}
          textClass="text-red"
        />
      </div>
    );
  }

  function handleToggleFilterMenu() {
    setIsFilterMenuOpen((currentState) => !currentState);
  }

  function handleToggleSearch() {
    if (isSearchOpen) {
      onFilterQueryChange("");
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    onFilterQueryChange("");
    setIsSearchOpen(false);
  }

  function handlePaginationChange(
    action: "prev" | "next" | "goto",
    pageNum?: number,
  ) {
    if (pendingAction) {
      return;
    }

    if (action === "prev") {
      onPageChange(Math.max(currentPage - 1, 1));
      return;
    }

    if (action === "next") {
      onPageChange(Math.min(currentPage + 1, totalPages));
      return;
    }

    if (action === "goto" && pageNum !== undefined) {
      onPageChange(pageNum);
    }
  }

  function handleSelectStatusFilter(values: QuarterUnitStatusFilter[]) {
    onStatusFilterChange(values);
  }

  function handleAssignResidentFromOverlay(unitId: string) {
    const unit = units.find((item) => item.id === unitId);

    if (!unit) {
      onUnavailableFeature("Unit kuarters tidak ditemui untuk tetapan penghuni.");
      return;
    }

    setSelectedUnitId(null);
    onRequestAssignResident(unit);
  }

  function handleDownloadUnits() {
    downloadQuarterUnits(exportUnits, categoryName, address);
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      {selectedUnitId ? (
        <KuartersUnitDetailsOverlay
          categoryId={categoryId}
          unitId={selectedUnitId}
          onClose={() => setSelectedUnitId(null)}
          onAssignOccupant={handleAssignResidentFromOverlay}
        />
      ) : null}

      <div className="flex flex-row justify-between px-3 pt-3">
        <div>
          <div className="text-lg font-bold text-dark-grey">
            Senarai Unit Kuarters
          </div>
          <div className="text-xs text-grey">
            Klik pada ikon kemaskini untuk mengubah maklumat unit dan penghuni.
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ToolbarButton
            icon={commonIcons.search}
            disabled={isLoading}
            label="Cari unit kuarters"
            isActive={isSearchOpen}
            onClick={handleToggleSearch}
          />
          <div ref={filterMenuRef} className="relative">
            <ToolbarButton
              icon={commonIcons.filter}
              label={`Tapis status unit: ${getStatusFilterLabel(statusFilter)}`}
              disabled={isLoading}

              isActive={isFilterButtonActive}
              hasPopup="menu"
              isExpanded={isFilterMenuOpen}
              onClick={handleToggleFilterMenu}
            />

            {isFilterMenuOpen && !isLoading ? (
              <FilterOption
                ariaLabel="Tapisan status unit"
                defaultLabel="Semua Status"
                optionSets={[
                  {
                    title: "Status Unit",
                    options: statusFilterOptions,
                    selectedValues: statusFilter,
                  },
                ]}
                onChange={(sets) => {
                  // Only one set, so update parent with its selectedValues
                  handleSelectStatusFilter(sets[0]?.selectedValues ?? []);
                }}
              />
            ) : null}
          </div>
          <ToolbarButton
            icon={commonIcons.download}
            disabled={isLoading}
            label="Muat turun senarai unit"
            onClick={handleDownloadUnits}
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
                label="CARIAN MENGIKUT UNIT ATAU PENGHUNI"
                value={filterQuery}
                state="active"
                onChange={onFilterQueryChange}
                placeholder="Contoh: A-01-02 atau Ahmad"
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
        <div className="rounded-lg overflow-x-auto overflow-y-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr className="font-bold text-xs text-grey bg-background">
                <th className="p-3 text-left w-min whitespace-nowrap">ID Unit</th>
                <th className="p-3 text-left w-min whitespace-nowrap">No. K/P Penghuni</th>
                <th className="p-3 text-left w-min whitespace-nowrap">Nama Penghuni</th>
                <th className="p-3 text-center w-min whitespace-nowrap">Tarikh Masuk</th>
                <th className="p-3 text-center w-min whitespace-nowrap">Tarikh Keluar</th>
                <th className="w-[0%] p-3 text-center whitespace-nowrap">Tindakan</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isLoading ? (
                loadingTableRows({
                  mode: "loading",
                  columnCount: 6,
                  rowCount: 10,
                })
              ) : null}

              {!isLoading && isCreateRowVisible ? (
                <tr
                  ref={editor?.mode === "create" ? editingRowRef : null}
                  className="border-t border-light-grey/20 bg-dark-blue/3"
                >
                  <td
                    className={`px-3 py-4 align-start w-min whitespace-nowrap ${getRowAccentClass(
                      editor.draft.occupantIcNumber.trim().length > 0
                        ? "OCCUPIED"
                        : "VACANT",
                    )}`}
                  >
                    <TableInputField
                      align="start"
                      value={editor.draft.unitCode}
                      placeholder="Contoh: A-01-05"
                      disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                      onChange={(value) => onDraftChange("unitCode", value)}
                    />
                  </td>
                  <td className="px-3 py-4 align-start w-min whitespace-nowrap">
                    <TablePickerField
                      align="start"
                      value={formatIcNumber(editor.draft.occupantIcNumber)}
                      placeholder="Pilih penghuni"
                      disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                      onClick={onOpenResidentPicker}
                    />
                  </td>
                  <td className="px-3 py-4 align-start w-min whitespace-nowrap">
                    <p className="text-sm font-semibold text-grey">
                      {editor.draft.occupantIcNumber.trim().length > 0
                        ? editor.draft.occupantName.trim() || "Penghuni dipilih."
                        : "N/A"}
                    </p>
                  </td>
                  <td className="px-3 py-4 text-center align-start text-sm font-semibold text-grey w-min whitespace-nowrap">
                    {editor.draft.occupantIcNumber.trim().length > 0 ? (
                      <KuartersUnitDatePicker
                        fieldType="moveInDate"
                        value={editor.draft.moveInDate}
                        disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                        required
                        occupancyHistory={[]}
                        onChange={(value) => onDraftChange("moveInDate", value)}
                      />
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-3 py-4 text-center align-start text-sm font-semibold text-grey w-min whitespace-nowrap">
                    {editor.draft.occupantIcNumber.trim().length > 0 ? (
                      <KuartersUnitDatePicker
                        fieldType="moveOutDate"
                        value={editor.draft.moveOutDate}
                        moveInDate={editor.draft.moveInDate}
                        disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                        occupancyHistory={[]}
                        onChange={(value) => onDraftChange("moveOutDate", value)}
                      />
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-3 py-4 align-start w-min whitespace-nowrap">
                    <div className="flex justify-center">
                      {renderCreateActionCell()}
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isLoading && units.length === 0 && !isCreateRowVisible ? (
                <tr className="border-t border-light-grey/20">
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-sm font-medium text-grey"
                  >
                    {hasActiveFilters
                      ? "Tiada unit kuarters yang sepadan dengan tapisan semasa."
                      : "Tiada unit kuarters untuk dipaparkan buat masa ini."}
                  </td>
                </tr>
              ) : null}

              {!isLoading && units.map((unit) => {
                const isEditing = editor?.mode === "edit" && editor.rowId === unit.id;
                const isCurrentRowPending = pendingUnitId === unit.id;
                const occupantIcNumber = unit.occupantIcNumber
                  ? formatIcNumber(unit.occupantIcNumber)
                  : formatQuarterUnitValue(unit.occupantIcNumber);
                const occupantName = formatQuarterUnitValue(unit.occupantName);
                const isVacant = unit.occupantIcNumber === null;
                const draftOccupantIcNumber = isEditing
                  ? editor.draft.occupantIcNumber.trim()
                  : "";
                const hasOccupantDraft = draftOccupantIcNumber.length > 0;
                const hasOccupantChanged =
                  isEditing &&
                  draftOccupantIcNumber !== (unit.occupantIcNumber ?? "");
                const draftOccupantName = isEditing
                  ? editor.draft.occupantName.trim()
                  : "";
                const activeUnitOccupancyHistory =
                  unitOccupancyHistory?.unitId === unit.id
                    ? unitOccupancyHistory.records
                    : [];
                const editableOccupancyId =
                  activeUnitOccupancyHistory.find(
                    (record) =>
                      record.status === "CURRENT" &&
                      record.occupantIcNumber === unit.occupantIcNumber,
                  )?.id ?? null;

                return (
                  <tr
                    key={unit.id}
                    ref={(node) => {
                      if (isEditing) {
                        editingRowRef.current = node;
                      }

                      if (unit.id === targetUnitId) {
                        targetUnitRowRef.current = node;
                      }
                    }}
                    className={`border-t border-light-grey/20 ${
                      unit.id === targetUnitId
                        ? "bg-dark-blue/8 ring-2 ring-inset ring-dark-blue/20"
                        : isEditing
                          ? "bg-dark-blue/3"
                          : "hover:bg-background/60"
                    } transition-colors`}
                  >
                    <td
                      className={`overflow-hidden text-sm font-semibold text-dark-grey align-middle w-min whitespace-nowrap
                        ${getRowAccentClass(isEditing ? hasOccupantDraft ? "OCCUPIED" : "VACANT" : unit.status,)}
                        ${isEditing ? "px-3 py-4" : "px-3 py-2"}`
                      }
                    >
                      {isEditing ? (
                        <TableInputField
                          value={editor.draft.unitCode}
                          placeholder="Contoh: A-01-02"
                          align="start"
                          disabled={isCurrentRowPending}
                          onChange={(value) => onDraftChange("unitCode", value)}
                        />
                      ) : (
                        <span className="text-sm font-semibold text-dark-grey">{unit.unitCode}</span>
                      )}
                    </td>
                    <td className={`overflow-hidden align-middle text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <TablePickerField
                          value={formatIcNumber(editor.draft.occupantIcNumber)}
                          placeholder="Pilih Penghuni"
                          align="start"
                          disabled={isCurrentRowPending}
                          onClick={onOpenResidentPicker}
                        />
                      ) : (
                        <span className={isVacant ? "text-grey" : undefined}>
                          {occupantIcNumber}
                        </span>
                      )}
                    </td>
                    <td className={`overflow-hidden align-middle text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <p
                          className={`${
                            hasOccupantChanged
                              ? "font-semibold text-grey"
                              : isVacant
                                ? "text-grey"
                                : "text-dark-grey"
                          }`}
                        >
                          {hasOccupantChanged
                            ? hasOccupantDraft
                              ? draftOccupantName || "Penghuni dipilih."
                              : "N/A"
                            : occupantName}
                        </p>
                      ) : (
                        <span className={isVacant ? "text-grey" : "text-dark-grey"}>
                          {occupantName}
                        </span>
                      )}
                    </td>
                    <td className={`overflow-hidden text-center align-middle text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing && hasOccupantDraft ? (
                        <KuartersUnitDatePicker
                          fieldType="moveInDate"
                          value={editor.draft.moveInDate}
                          disabled={isCurrentRowPending}
                          required
                          occupancyHistory={activeUnitOccupancyHistory}
                          excludedOccupancyId={editableOccupancyId}
                          onChange={(value) => onDraftChange("moveInDate", value)}
                        />
                      ) : (
                        <span
                          className={
                            unit.moveInDate ? "text-dark-grey" : "text-grey"
                          }
                        >
                          {formatDisplayDate(unit.moveInDate)}
                        </span>
                      )}
                    </td>
                    <td className={`overflow-hidden text-center align-middle text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing && hasOccupantDraft ? (
                        <KuartersUnitDatePicker
                          fieldType="moveOutDate"
                          value={editor.draft.moveOutDate}
                          moveInDate={editor.draft.moveInDate}
                          disabled={isCurrentRowPending}
                          occupancyHistory={activeUnitOccupancyHistory}
                          excludedOccupancyId={editableOccupancyId}
                          onChange={(value) => onDraftChange("moveOutDate", value)}
                        />
                      ) : (
                        <span
                          className={
                            unit.moveOutDate ? "text-dark-grey" : "text-grey"
                          }
                        >
                          {formatDisplayDate(unit.moveOutDate)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex justify-center">
                        {renderActionCell(unit, isEditing)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t bg-white border-light-grey/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            totalRecords={totalRecords}
            paginationItems={paginationItems}
            onPageChange={handlePaginationChange}
          />
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-8 right-8 z-40 flex gap-1 p-4 items-center justify-center rounded-lg bg-dark-blue text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95"
        disabled={Boolean(pendingAction)}
        onClick={onAddUnit}
      >
        <Icon icon="add" size={15} />
        <span className="font-bold text-xs">Tambah Unit</span>
      </button>
    </section>
  );
}

function formatDisplayDate(value: string | null) {
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

function formatIcNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}


