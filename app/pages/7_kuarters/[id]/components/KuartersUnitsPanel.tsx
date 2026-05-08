"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Icon, { commonIcons } from "@/app/components/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/xlsx-export";

import type {
  KuartersUnitEditorState,
  PaginationItem,
  QuarterUnitDraft,
  QuarterUnitRecord,
  QuarterUnitStatusFilter,
} from "./kuartersUnitHelpers";
import {
  EMPTY_QUARTER_UNIT_ID,
  formatQuarterUnitValue,
} from "./kuartersUnitHelpers";
import KuartersUnitDetailsOverlay from "./KuartersUnitDetailsOverlay";

type KuartersUnitsPanelProps = {
  units: QuarterUnitRecord[];
  exportUnits: QuarterUnitRecord[];
  categoryId: string;
  categoryName: string;
  address: string | null;
  currentPage: number;
  editor: KuartersUnitEditorState | null;
  filterQuery: string;
  statusFilter: QuarterUnitStatusFilter;
  hasActiveFilters: boolean;
  isResidentPickerOpen: boolean;
  pageItems: PaginationItem[];
  pendingAction: "save" | "delete" | null;
  pendingUnitId: string | null;
  recordSummaryText: string;
  totalPages: number;
  onAddUnit: () => void;
  onCancelEdit: () => void;
  onDeleteUnit: (rowId: string) => void;
  onDraftChange: (field: keyof QuarterUnitDraft, value: string) => void;
  onEditUnit: (unit: QuarterUnitRecord) => void;
  onFilterQueryChange: (value: string) => void;
  onRequestAssignResident: (unit: QuarterUnitRecord) => void;
  onStatusFilterChange: (value: QuarterUnitStatusFilter) => void;
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

function PageButton({
  item,
  currentPage,
  disabled = false,
  onClick,
}: {
  item: PaginationItem;
  currentPage: number;
  disabled?: boolean;
  onClick: (page: number) => void;
}) {
  if (item === "ellipsis") {
    return (
      <span className="px-1 text-sm font-semibold text-grey" aria-hidden="true">
        ...
      </span>
    );
  }

  const isActive = item === currentPage;

  return (
    <button
      type="button"
      className={`min-h-8 min-w-8 rounded-md border px-2 text-sm transition-colors ${
        isActive
          ? "border-dark-blue bg-dark-blue font-bold text-white"
          : "border-light-grey/30 bg-white text-grey hover:border-dark-blue hover:text-dark-blue"
      } disabled:cursor-not-allowed disabled:opacity-40`}
      aria-current={isActive ? "page" : undefined}
      disabled={disabled}
      onClick={() => onClick(item)}
    >
      {item}
    </button>
  );
}

function InputField({
  value,
  placeholder,
  disabled = false,
  onChange,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-sm font-semibold text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue disabled:cursor-not-allowed disabled:bg-background"
    />
  );
}

function getFloatingDatePickerPosition(buttonRect: DOMRect, pickerWidth: number) {
  const horizontalPadding = 12;
  const verticalGap = 8;
  const estimatedPickerHeight = 360;
  const left = Math.min(
    Math.max(horizontalPadding, buttonRect.right - pickerWidth),
    window.innerWidth - pickerWidth - horizontalPadding,
  );
  const hasBottomRoom =
    buttonRect.bottom + verticalGap + estimatedPickerHeight <= window.innerHeight;
  const top = hasBottomRoom
    ? buttonRect.bottom + verticalGap
    : Math.max(verticalGap, buttonRect.top - estimatedPickerHeight - verticalGap);

  return { left, top };
}

function DatePickerField({
  value,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  onChange: (value: string) => void;
}) {
  const initialDate = parseDateInput(value);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({
    left: 0,
    top: 0,
  });
  const [visibleMonth, setVisibleMonth] = useState(
    initialDate ?? startOfDay(new Date()),
  );
  const days = buildCalendarDays(visibleMonth);
  const pickerWidth = 288;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePickerPosition() {
      const buttonRect = buttonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setPickerPosition(getFloatingDatePickerPosition(buttonRect, pickerWidth));
    }

    updatePickerPosition();
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [isOpen]);

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={`flex min-h-10 w-full items-center gap-2 rounded-2xl border bg-white py-2 pl-3 pr-3 text-left text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_10px_rgba(15,23,42,0.04)] outline-none transition-colors disabled:cursor-not-allowed disabled:bg-background disabled:text-light-grey ${
          isOpen
            ? "border-dark-blue text-dark-blue"
            : "border-light-grey/25 text-dark-grey hover:border-dark-blue/30"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          if (!isOpen) {
            const buttonRect = buttonRef.current?.getBoundingClientRect();

            if (buttonRect) {
              setPickerPosition(
                getFloatingDatePickerPosition(buttonRect, pickerWidth),
              );
            }

            setVisibleMonth(parseDateInput(value) ?? startOfDay(new Date()));
          }

          setIsOpen((currentState) => !currentState);
        }}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
          <Icon icon="calendar_month" size={16} />
        </span>
        <span className={value ? "truncate" : "truncate text-grey"}>
          {value ? formatDatePickerLabel(value) : "Pilih tarikh"}
        </span>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
        <div
          data-kuarters-date-picker="true"
          className="fixed z-60 w-72 rounded-3xl border border-light-grey/20 bg-white p-3 text-left shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
          style={{
            left: `${pickerPosition.left}px`,
            top: `${pickerPosition.top}px`,
          }}
          role="dialog"
          aria-label="Pilih tarikh penghunian"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
              aria-label="Bulan sebelumnya"
              onClick={() =>
                setVisibleMonth((currentDate) => addMonths(currentDate, -1))
              }
            >
              <Icon icon="chevron_left" size={20} />
            </button>
            <div className="text-sm font-extrabold text-dark-grey">
              {formatMonthLabel(visibleMonth)}
            </div>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
              aria-label="Bulan seterusnya"
              onClick={() =>
                setVisibleMonth((currentDate) => addMonths(currentDate, 1))
              }
            >
              <Icon icon="chevron_right" size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-grey">
            {["A", "I", "S", "R", "K", "J", "S"].map((dayLabel, index) => (
              <div key={`${dayLabel}-${index}`} className="py-1.5">
                {dayLabel}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateValue = formatDateInput(day.date);
              const isSelected = dateValue === value;
              const isVisibleMonth =
                day.date.getMonth() === visibleMonth.getMonth();
              const isDisabled = Boolean(
                (minDate && dateValue < minDate) ||
                  (maxDate && dateValue > maxDate),
              );

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isDisabled}
                  className={`grid h-9 place-items-center rounded-xl text-sm font-bold transition-colors ${
                    isDisabled
                      ? "cursor-not-allowed text-light-grey/60"
                      : isSelected
                      ? "bg-dark-blue text-white"
                      : isVisibleMonth
                        ? "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                        : "text-light-grey hover:bg-light-blue"
                  }`}
                  onClick={() => {
                    onChange(dateValue);
                    setIsOpen(false);
                  }}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>

          {value && !required ? (
            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-light-grey/25 px-3 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              Kosongkan tarikh
            </button>
          ) : null}
        </div>,
          document.body,
        )
        : null}
    </div>
  );
}

function PickerField({
  value,
  placeholder,
  disabled = false,
  onClick,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-left text-sm font-semibold text-dark-blue outline-none transition-colors hover:border-dark-blue disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60"
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <span className={value ? "text-dark-blue" : "text-light-grey"}>
        {value || placeholder}
      </span>
      <Icon icon={commonIcons.search} size={18} className="text-light-grey" />
    </button>
  );
}

function getRowAccentClass(status: QuarterUnitRecord["status"]) {
  return status === "OCCUPIED"
    ? "border-l-4 border-l-green"
    : "border-l-4 border-l-pencen-datang";
}

function getStatusFilterLabel(status: QuarterUnitStatusFilter) {
  if (status === "OCCUPIED") {
    return "Didiami";
  }

  if (status === "VACANT") {
    return "Kosong";
  }

  return "Semua Status";
}

export default function KuartersUnitsPanel({
  units,
  exportUnits,
  categoryId,
  categoryName,
  address,
  currentPage,
  editor,
  filterQuery,
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
  pageItems,
  pendingAction,
  pendingUnitId,
  recordSummaryText,
  totalPages,
}: KuartersUnitsPanelProps) {
  const isCreateRowVisible = editor?.mode === "create";
  const editingRowRef = useRef<HTMLTableRowElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(
    filterQuery.trim().length > 0,
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const isSearchFilterActive = filterQuery.trim().length > 0;
  const isStatusFilterActive = statusFilter !== "ALL";
  const isFilterButtonActive = isFilterMenuOpen || isStatusFilterActive;

  const handlePointerDownOutsideEditor = useEffectEvent((event: PointerEvent) => {
    if (!editor || pendingAction || isResidentPickerOpen) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (
      target instanceof Element &&
      target.closest("[data-kuarters-date-picker='true']")
    ) {
      return;
    }

    if (editingRowRef.current?.contains(target)) {
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
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

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

  function handleSelectStatusFilter(value: QuarterUnitStatusFilter) {
    onStatusFilterChange(value);
    setIsFilterMenuOpen(false);
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
    const headers: XlsxCell[] = [
      { value: "ID Unit", style: "header" },
      { value: "No. Kad Pengenalan Penghuni", style: "header" },
      { value: "Nama Penghuni", style: "header" },
      { value: "Tarikh Masuk", style: "header", align: "center" },
      { value: "Tarikh Keluar", style: "header", align: "center" },
      { value: "Status", style: "header", align: "center" },
    ];
    const rows: XlsxSheet["rows"] = exportUnits.map((unit) => [
      unit.unitCode,
      unit.occupantIcNumber ? formatIcNumber(unit.occupantIcNumber) : "N/A",
      unit.occupantName ?? "N/A",
      { value: formatDisplayDate(unit.moveInDate), align: "center" },
      { value: formatDisplayDate(unit.moveOutDate), align: "center" },
      {
        value: getStatusFilterLabel(unit.status),
        align: "center",
      },
    ]);

    downloadXlsxFile({
      filename: buildUnitsExportFilename(categoryName, address),
      sheets: [
        {
          name: "Senarai Unit",
          columns: [
            { width: 18 },
            { width: 30 },
            { width: 38 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  }

  return (
    <section className="rounded-2xl border border-light-grey/20 bg-light-blue p-4 sm:p-5">
      {selectedUnitId ? (
        <KuartersUnitDetailsOverlay
          categoryId={categoryId}
          unitId={selectedUnitId}
          onClose={() => setSelectedUnitId(null)}
          onAssignOccupant={handleAssignResidentFromOverlay}
        />
      ) : null}

      <div className="flex flex-col gap-4 border-b border-light-grey/20 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-dark-grey">
            Senarai Unit Kuarters
          </h2>
          <p className="text-sm text-grey">
            Klik pada ikon kemaskini untuk mengubah maklumat unit dan penghuni.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <ToolbarButton
            icon={commonIcons.search}
            label="Cari unit kuarters"
            isActive={isSearchOpen}
            onClick={handleToggleSearch}
          />
          <div ref={filterMenuRef} className="relative">
            <ToolbarButton
              icon={commonIcons.filter}
              label={`Tapis status unit: ${getStatusFilterLabel(statusFilter)}`}
              isActive={isFilterButtonActive}
              hasPopup="menu"
              isExpanded={isFilterMenuOpen}
              onClick={handleToggleFilterMenu}
            />

            {isFilterMenuOpen ? (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-light-grey/20 bg-white p-2 shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
                role="listbox"
                aria-label="Tapisan status unit"
              >
                <div className="border-b border-light-grey/20 px-3 pb-3 pt-2">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                    Status Unit
                  </p>
                  <p className="mt-1 text-sm text-grey">
                    Pilih unit yang ingin dipaparkan.
                  </p>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  {(["ALL", "OCCUPIED", "VACANT"] as const).map((option) => {
                    const isSelected = statusFilter === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                          isSelected
                            ? "bg-dark-blue text-white"
                            : "text-dark-grey hover:bg-light-blue"
                        }`}
                        onClick={() => handleSelectStatusFilter(option)}
                      >
                        <span className="truncate">
                          {getStatusFilterLabel(option)}
                        </span>
                        {isSelected ? (
                          <Icon icon="done" size={16} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <ToolbarButton
            icon={commonIcons.download}
            label="Muat turun senarai unit"
            onClick={handleDownloadUnits}
          />
        </div>
      </div>

      {isSearchOpen ? (
      <div className="mt-4 rounded-2xl border border-light-grey/20 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block flex-1">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
              Carian Mengikut Unit atau Penghuni
            </span>
            <div className="flex items-center gap-3 rounded-xl border border-lightGrey/30 bg-background px-3 py-2 transition-colors focus-within:border-darkblue">
              <Icon
                icon={commonIcons.search}
                size={18}
                className="text-lightGrey"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={filterQuery}
                onChange={(event) => onFilterQueryChange(event.target.value)}
                placeholder="Contoh: A-01-02 atau Ahmad"
                className="w-full border-none bg-transparent text-sm font-medium text-darkGrey outline-none placeholder:text-lightGrey"
              />
            </div>
          </label>

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
      ) : null}

      <div className="mt-5 flex flex-col overflow-hidden rounded-2xl border border-light-grey/20 bg-white">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-260 table-fixed border-collapse">
            <thead className="bg-background">
              <tr>
                <th className="w-[15%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  ID Unit
                </th>
                <th className="w-[23%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  No. Kad Pengenalan Penghuni
                </th>
                <th className="w-[28%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Nama Penghuni
                </th>
                <th className="w-[12%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Tarikh Masuk
                </th>
                <th className="w-[12%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Tarikh Keluar
                </th>
                <th className="w-[10%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Tindakan
                </th>
              </tr>
            </thead>
            <tbody>
              {isCreateRowVisible ? (
                <tr
                  ref={editor?.mode === "create" ? editingRowRef : null}
                  className="border-t border-light-grey/20 bg-dark-blue/3"
                >
                  <td
                    className={`px-6 py-4 align-middle ${getRowAccentClass(
                      editor.draft.occupantIcNumber.trim().length > 0
                        ? "OCCUPIED"
                        : "VACANT",
                    )}`}
                  >
                    <InputField
                      value={editor.draft.unitCode}
                      placeholder="Contoh: A-01-05"
                      disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                      onChange={(value) => onDraftChange("unitCode", value)}
                    />
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <PickerField
                      value={formatIcNumber(editor.draft.occupantIcNumber)}
                      placeholder="Pilih penghuni"
                      disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                      onClick={onOpenResidentPicker}
                    />
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <p className="text-sm font-medium italic text-grey">
                      {editor.draft.occupantIcNumber.trim().length > 0
                        ? editor.draft.occupantName.trim() || "Penghuni dipilih."
                        : "N/A"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center align-middle text-sm font-semibold text-grey">
                    {editor.draft.occupantIcNumber.trim().length > 0 ? (
                      <DatePickerField
                        value={editor.draft.moveInDate}
                        disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                        required
                        maxDate={
                          editor.draft.moveOutDate || getTodayDateInputValue()
                        }
                        onChange={(value) => onDraftChange("moveInDate", value)}
                      />
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-6 py-4 text-center align-middle text-sm font-semibold text-grey">
                    {editor.draft.occupantIcNumber.trim().length > 0 ? (
                      <DatePickerField
                        value={editor.draft.moveOutDate}
                        disabled={pendingUnitId === EMPTY_QUARTER_UNIT_ID}
                        minDate={editor.draft.moveInDate}
                        maxDate={getTodayDateInputValue()}
                        onChange={(value) => onDraftChange("moveOutDate", value)}
                      />
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <div className="flex justify-center">
                      {renderCreateActionCell()}
                    </div>
                  </td>
                </tr>
              ) : null}

              {units.length === 0 && !isCreateRowVisible ? (
                <tr className="border-t border-light-grey/20">
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm font-medium text-grey"
                  >
                    {hasActiveFilters
                      ? "Tiada unit kuarters yang sepadan dengan tapisan semasa."
                      : "Tiada unit kuarters untuk dipaparkan buat masa ini."}
                  </td>
                </tr>
              ) : null}

              {units.map((unit) => {
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

                return (
                  <tr
                    key={unit.id}
                    ref={isEditing ? editingRowRef : null}
                    className="border-t border-light-grey/20"
                  >
                    <td
                      className={`px-6 py-4 align-middle ${getRowAccentClass(
                        isEditing
                          ? hasOccupantDraft
                            ? "OCCUPIED"
                            : "VACANT"
                          : unit.status,
                      )}`}
                    >
                      {isEditing ? (
                        <InputField
                          value={editor.draft.unitCode}
                          placeholder="Contoh: A-01-02"
                          disabled={isCurrentRowPending}
                          onChange={(value) => onDraftChange("unitCode", value)}
                        />
                      ) : (
                        <span className="inline-flex w-fit rounded-xl border border-light-grey/30 bg-background px-4 py-2 text-sm font-extrabold text-dark-blue">
                          {unit.unitCode}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-middle text-sm font-semibold text-dark-grey">
                      {isEditing ? (
                        <PickerField
                          value={formatIcNumber(editor.draft.occupantIcNumber)}
                          placeholder="Pilih penghuni"
                          disabled={isCurrentRowPending}
                          onClick={onOpenResidentPicker}
                        />
                      ) : (
                        <span className={isVacant ? "text-grey" : undefined}>
                          {occupantIcNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-middle text-sm font-semibold">
                      {isEditing ? (
                        <p
                          className={`${
                            hasOccupantChanged
                              ? "font-medium italic text-grey"
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
                    <td className="px-6 py-4 text-center align-middle text-sm font-semibold">
                      {isEditing && hasOccupantDraft ? (
                        <DatePickerField
                          value={editor.draft.moveInDate}
                          disabled={isCurrentRowPending}
                          required
                          maxDate={
                            editor.draft.moveOutDate || getTodayDateInputValue()
                          }
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
                    <td className="px-6 py-4 text-center align-middle text-sm font-semibold">
                      {isEditing && hasOccupantDraft ? (
                        <DatePickerField
                          value={editor.draft.moveOutDate}
                          disabled={isCurrentRowPending}
                          minDate={editor.draft.moveInDate}
                          maxDate={getTodayDateInputValue()}
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
                    <td className="px-6 py-4 align-middle">
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

        <div className="flex flex-col gap-3 border-t border-light-grey/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
              disabled={currentPage <= 1 || Boolean(pendingAction)}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <Icon icon={commonIcons.chevronLeft} size={18} />
            </button>

            {pageItems.map((item, index) => (
              <PageButton
                key={`${item}-${index}`}
                item={item}
                currentPage={currentPage}
                disabled={Boolean(pendingAction)}
                onClick={onPageChange}
              />
            ))}

            <button
              type="button"
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman seterusnya"
              disabled={currentPage >= totalPages || Boolean(pendingAction)}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <Icon icon={commonIcons.chevronRight} size={18} />
            </button>
          </div>

          <p className="text-sm text-grey">{recordSummaryText}</p>
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-extrabold text-white shadow-[0_18px_45px_rgba(13,47,86,0.28)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:bottom-8 sm:right-8"
        disabled={Boolean(pendingAction)}
        onClick={onAddUnit}
      >
        <Icon icon="add" size={20} />
        Tambah Unit
      </button>
    </section>
  );
}

function buildUnitsExportFilename(categoryName: string, address: string | null) {
  return [
    "senarai-unit-kuarters",
    sanitizeFilenamePart(categoryName),
    sanitizeFilenamePart(address ?? "tiada-alamat"),
  ]
    .filter(Boolean)
    .join("-");
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(monthDate: Date) {
  const firstDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const firstCalendarDate = new Date(firstDayOfMonth);
  firstCalendarDate.setDate(
    firstCalendarDate.getDate() - firstCalendarDate.getDay(),
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate);
    date.setDate(firstCalendarDate.getDate() + index);

    return { date };
  });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDatePickerLabel(value: string) {
  const date = parseDateInput(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("ms-MY", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTodayDateInputValue() {
  return formatDateInput(new Date());
}
