"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import Icon, { commonIcons } from "@/app/components/Icon";

import {
  EMPTY_QUARTER_CLASS_ID,
  formatMoney,
  type PaginationItem,
  type KuartersEditorState,
  type QuarterClassDraft,
  type QuarterClassRecord,
} from "./kuartersHelpers";

type KuartersClassRatesPanelProps = {
  rates: QuarterClassRecord[];
  currentPage: number;
  editor: KuartersEditorState | null;
  filterQuery: string;
  hasActiveFilters: boolean;
  onCancelEdit: () => void;
  pendingAction: "save" | "delete" | null;
  pendingRowId: string | null;
  pageItems: PaginationItem[];
  recordSummaryText: string;
  totalPages: number;
  onAddRow: () => void;
  onClearFilter: () => void;
  onDeleteRow: (rowId: string) => void;
  onDraftChange: (field: keyof QuarterClassDraft, value: string) => void;
  onEditRow: (quarterClass: QuarterClassRecord) => void;
  onFilterQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSaveRow: () => void;
  onUnavailableFeature: (message: string) => void;
  onViewRow: (quarterClass: QuarterClassRecord) => void;
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
      onClick={onClick}
      title={label}
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
      onClick={onClick}
      title={label}
    >
      <Icon icon={icon} size={20} />
    </button>
  );
}

function InputField({
  value,
  placeholder,
  align = "center",
  inputMode = "text",
  disabled = false,
  onChange,
}: {
  value: string;
  placeholder: string;
  align?: "start" | "center" | "end";
  inputMode?: "decimal" | "text";
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`min-h-9 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-sm font-semibold text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue ${
        align === "start"
          ? "w-full min-w-35 text-left"
          : align === "end"
            ? "w-full min-w-32 text-right"
            : "w-full min-w-32 text-center"
      } disabled:cursor-not-allowed disabled:bg-background`}
    />
  );
}

export default function KuartersClassRatesPanel({
  currentPage,
  editor,
  filterQuery,
  hasActiveFilters,
  onCancelEdit,
  onAddRow,
  onClearFilter,
  onDeleteRow,
  onDraftChange,
  onEditRow,
  onFilterQueryChange,
  onPageChange,
  onSaveRow,
  onUnavailableFeature,
  onViewRow,
  pendingAction,
  pendingRowId,
  pageItems,
  rates,
  recordSummaryText,
  totalPages,
}: KuartersClassRatesPanelProps) {
  const isCreateRowVisible = editor?.mode === "create";
  const editingRowRef = useRef<HTMLTableRowElement | null>(null);

  const handlePointerDownOutsideEditor = useEffectEvent((event: PointerEvent) => {
    if (!editor || pendingAction) {
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
    if (!editor || pendingAction) {
      return;
    }

    document.addEventListener("pointerdown", handlePointerDownOutsideEditor);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDownOutsideEditor,
      );
    };
  }, [editor, pendingAction]);

  function renderActionCell(rowId: string, isEditing: boolean) {
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <ActionButton
            icon={commonIcons.save}
            label="Simpan"
            disabled={Boolean(pendingAction)}
            onClick={onSaveRow}
            textClass="text-green"
          />
          <ActionButton
            icon={commonIcons.delete}
            label="Padam"
            disabled={Boolean(pendingAction)}
            onClick={() => onDeleteRow(rowId)}
            textClass="text-red"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <ActionButton
          icon={commonIcons.edit}
          label="Edit"
          disabled={Boolean(pendingAction)}
          onClick={() => {
            const selectedQuarterClass = rates.find((item) => item.id === rowId);

            if (selectedQuarterClass) {
              onEditRow(selectedQuarterClass);
            }
          }}
          textClass="text-dark-blue"
        />
        <ActionButton
          icon={commonIcons.eye}
          label="Lihat"
          disabled={Boolean(pendingAction)}
          onClick={() => {
            const selectedQuarterClass = rates.find((item) => item.id === rowId);

            if (selectedQuarterClass) {
              onViewRow(selectedQuarterClass);
            }
          }}
          textClass="text-grey"
        />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-light-grey/20 bg-light-blue p-4 sm:p-5">
      <div className="flex flex-col gap-4 border-b border-light-grey/20 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-dark-grey">
            Senarai Kelas Kuarters
          </h2>
          <p className="text-sm text-grey">
            Kemaskini maklumat yuran dan denda mengikut kelas kuarters.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <ToolbarButton
            icon={commonIcons.download}
            label="Muat turun data kelas kuarters"
            onClick={() =>
              onUnavailableFeature("Fungsi muat turun belum tersedia lagi.")
            }
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-light-grey/20 bg-white p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                Carian Mengikut Kelas
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
                  placeholder="Contoh: Kelas A"
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
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-light-grey/20 bg-white">
        <div className="overflow-x-auto">
          {/* The table stays semantic so the edit and add flows can grow without changing the layout structure. */}
          <table className="w-full min-w-190 table-fixed border-collapse">
            <thead className="bg-background">
              <tr>
                <th className="w-[28%] px-6 py-4 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Kelas
                </th>
                <th className="w-[20%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Sewa (RM)
                </th>
                <th className="w-[24%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Senggara (RM)
                </th>
                <th className="w-[18%] px-6 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                  Penalti (RM)
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
                  <td className="px-6 py-4">
                    <InputField
                      value={editor.draft.className}
                      placeholder="Masukkan nama kelas"
                      align="start"
                      disabled={pendingRowId === EMPTY_QUARTER_CLASS_ID}
                      onChange={(value) => onDraftChange("className", value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <InputField
                      value={editor.draft.rentalPrice}
                      placeholder="0.00"
                      align="center"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CLASS_ID}
                      onChange={(value) => onDraftChange("rentalPrice", value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <InputField
                      value={editor.draft.maintenancePrice}
                      placeholder="0.00"
                      align="center"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CLASS_ID}
                      onChange={(value) =>
                        onDraftChange("maintenancePrice", value)
                      }
                    />
                  </td>
                  <td className="px-6 py-4">
                    <InputField
                      value={editor.draft.penaltyPrice}
                      placeholder="0.00"
                      align="center"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CLASS_ID}
                      onChange={(value) => onDraftChange("penaltyPrice", value)}
                    />
                  </td>
                  <td className="px-6 py-4">{renderActionCell(EMPTY_QUARTER_CLASS_ID, true)}</td>
                </tr>
              ) : null}

              {rates.length === 0 && !isCreateRowVisible ? (
                <tr className="border-t border-light-grey/20">
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm font-medium text-grey"
                  >
                    {hasActiveFilters
                      ? "Tiada kelas kuarters yang sepadan dengan tapisan semasa."
                      : "Tiada kelas kuarters untuk dipaparkan buat masa ini."}
                  </td>
                </tr>
              ) : null}

              {rates.map((rate) => {
                const isEditing = editor?.mode === "edit" && editor.rowId === rate.id;
                const isCurrentRowPending = pendingRowId === rate.id;

                return (
                  <tr
                    key={rate.id}
                    ref={isEditing ? editingRowRef : null}
                    className="border-t border-light-grey/20"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-dark-grey">
                      <span className="block">{rate.className}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-dark-grey">
                      {isEditing ? (
                        <InputField
                          value={editor.draft.rentalPrice}
                          placeholder="0.00"
                          align="center"
                          inputMode="decimal"
                          disabled={isCurrentRowPending}
                          onChange={(value) =>
                            onDraftChange("rentalPrice", value)
                          }
                        />
                      ) : (
                        <span className="block text-center">
                          {formatMoney(rate.rentalPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-dark-grey">
                      {isEditing ? (
                        <InputField
                          value={editor.draft.maintenancePrice}
                          placeholder="0.00"
                          align="center"
                          inputMode="decimal"
                          disabled={isCurrentRowPending}
                          onChange={(value) =>
                            onDraftChange("maintenancePrice", value)
                          }
                        />
                      ) : (
                        <span className="block text-center">
                          {formatMoney(rate.maintenancePrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-dark-grey">
                      {isEditing ? (
                        <InputField
                          value={editor.draft.penaltyPrice}
                          placeholder="0.00"
                          align="center"
                          inputMode="decimal"
                          disabled={isCurrentRowPending}
                          onChange={(value) =>
                            onDraftChange("penaltyPrice", value)
                          }
                        />
                      ) : (
                        <span className="block text-center">
                          {formatMoney(rate.penaltyPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {renderActionCell(rate.id, isEditing)}
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
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors disabled:opacity-40"
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
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors disabled:opacity-40"
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
          onClick={onAddRow}
        >
          <Icon icon="add" size={18} />
          Tambah Kelas
        </button>
      </div>
    </section>
  );
}
