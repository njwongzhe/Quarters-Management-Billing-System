"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import Icon, { commonIcons } from "@/app/components/Icon";

import type {
  KuartersUnitEditorState,
  PaginationItem,
  QuarterUnitDraft,
  QuarterUnitRecord,
} from "./kuartersUnitHelpers";
import {
  EMPTY_QUARTER_UNIT_ID,
  formatQuarterUnitValue,
} from "./kuartersUnitHelpers";

type KuartersUnitsPanelProps = {
  units: QuarterUnitRecord[];
  currentPage: number;
  editor: KuartersUnitEditorState | null;
  filterQuery: string;
  hasActiveFilters: boolean;
  isResidentPickerOpen: boolean;
  pageItems: PaginationItem[];
  pendingAction: "save" | "delete" | null;
  pendingUnitId: string | null;
  recordSummaryText: string;
  totalPages: number;
  onAddUnit: () => void;
  onCancelEdit: () => void;
  onClearFilter: () => void;
  onDeleteUnit: (rowId: string) => void;
  onDraftChange: (field: keyof QuarterUnitDraft, value: string) => void;
  onEditUnit: (unit: QuarterUnitRecord) => void;
  onFilterQueryChange: (value: string) => void;
  onOpenResidentPicker: () => void;
  onPageChange: (page: number) => void;
  onSaveUnit: () => void;
  onUnavailableFeature: (message: string) => void;
};

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-lg border border-light-grey/20 bg-white p-2 text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon icon={icon} size={20} />
    </button>
  );
}

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

export default function KuartersUnitsPanel({
  units,
  currentPage,
  editor,
  filterQuery,
  hasActiveFilters,
  isResidentPickerOpen,
  onAddUnit,
  onCancelEdit,
  onClearFilter,
  onDeleteUnit,
  onDraftChange,
  onEditUnit,
  onFilterQueryChange,
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

    onCancelEdit();
  });

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
          onClick={() =>
            onUnavailableFeature(
              `Paparan terperinci untuk unit ${unit.unitCode} belum tersedia lagi.`,
            )
          }
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

  return (
    <section className="rounded-2xl border border-light-grey/20 bg-light-blue p-4 sm:p-5">
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
            icon={commonIcons.download}
            label="Muat turun senarai unit"
            onClick={() =>
              onUnavailableFeature("Fungsi muat turun senarai unit belum tersedia lagi.")
            }
          />
          <ToolbarButton
            icon={commonIcons.filter}
            label="Tapisan tambahan"
            onClick={() =>
              onUnavailableFeature(
                "Tapisan tambahan untuk senarai unit belum tersedia lagi.",
              )
            }
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-light-grey/20 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block flex-1">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
              Carian Mengikut Unit atau Penghuni
            </span>
            <div className="flex items-center gap-3 rounded-xl border border-light-grey/30 bg-background px-3 py-2 transition-colors focus-within:border-dark-blue">
              <Icon
                icon={commonIcons.search}
                size={18}
                className="text-light-grey"
              />
              <input
                type="text"
                value={filterQuery}
                onChange={(event) => onFilterQueryChange(event.target.value)}
                placeholder="Contoh: A-01-02 atau Ahmad"
                className="w-full border-none bg-transparent text-sm font-medium text-dark-grey outline-none placeholder:text-light-grey"
              />
            </div>
          </label>

          <div className="flex items-center gap-3 self-start lg:self-end">
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasActiveFilters}
              onClick={onClearFilter}
            >
              Kosongkan
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-light-grey/20 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 table-fixed border-collapse">
            <thead className="bg-background">
              <tr>
                <th className="w-[22%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  ID Unit
                </th>
                <th className="w-[28%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  No. Kad Pengenalan Penghuni
                </th>
                <th className="w-[40%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Nama Penghuni
                </th>
                <th className="w-[10%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
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
                      value={editor.draft.occupantIcNumber}
                      placeholder="Klik untuk pilih penghuni"
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
                  <td className="px-6 py-4 align-middle">{renderCreateActionCell()}</td>
                </tr>
              ) : null}

              {units.length === 0 && !isCreateRowVisible ? (
                <tr className="border-t border-light-grey/20">
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm font-medium text-grey"
                  >
                    {hasActiveFilters
                      ? "Tiada unit kuarters yang sepadan dengan carian semasa."
                      : "Tiada unit kuarters untuk dipaparkan buat masa ini."}
                  </td>
                </tr>
              ) : null}

              {units.map((unit) => {
                const isEditing = editor?.mode === "edit" && editor.rowId === unit.id;
                const isCurrentRowPending = pendingUnitId === unit.id;
                const occupantIcNumber = formatQuarterUnitValue(
                  unit.occupantIcNumber,
                );
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
                          value={editor.draft.occupantIcNumber}
                          placeholder="Klik untuk pilih penghuni"
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
                    <td className="px-6 py-4 align-middle">
                      {renderActionCell(unit, isEditing)}
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

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-dark-blue px-4 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(pendingAction)}
          onClick={onAddUnit}
        >
          <Icon icon="add" size={18} />
          Tambah Unit
        </button>
      </div>
    </section>
  );
}
