"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { PaginationControls } from "@/app/components/Pagination/Pagination";
import ToolbarButton from "@/app/components/Icon/ToolbarIconButton";
import { downloadQuarterCategoryRates } from "@/app/pages/7_kuarters/hooks/kuartersDownloads";

import {
  EMPTY_QUARTER_CATEGORY_ID,
  formatMoney,
  type KuartersEditorState,
  type QuarterCategoryDraft,
  type QuarterCategoryRecord,
} from "./kuartersHelpers";

type KuartersCategoryRatesPanelProps = {
  rates: QuarterCategoryRecord[];
  exportRates: QuarterCategoryRecord[];
  isLoading: boolean;
  currentPage: number;
  editor: KuartersEditorState | null;
  filterQuery: string;
  hasActiveFilters: boolean;
  onCancelEdit: () => void;
  pendingAction: "save" | "delete" | null;
  pendingRowId: string | null;
  paginationItems: (number | "ellipsis")[];
  startIndex: number;
  endIndex: number;
  totalRecords: number;
  totalPages: number;
  onAddRow: () => void;
  onClearFilter: () => void;
  onDeleteRow: (rowId: string) => void;
  onDraftChange: (field: keyof QuarterCategoryDraft, value: string) => void;
  onEditRow: (quarterCategory: QuarterCategoryRecord) => void;
  onFilterQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSaveRow: () => void;
  onViewRow: (quarterCategory: QuarterCategoryRecord) => void;
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

export default function KuartersCategoryRatesPanel({
  isLoading,
  currentPage,
  editor,
  exportRates,
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
  onViewRow,
  pendingAction,
  pendingRowId,
  paginationItems,
  rates,
  startIndex,
  endIndex,
  totalRecords,
  totalPages,
}: KuartersCategoryRatesPanelProps) {
  const isCreateRowVisible = editor?.mode === "create";
  const editingRowRef = useRef<HTMLTableRowElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(hasActiveFilters);

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

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  function handleToggleSearch() {
    if (isSearchOpen) {
      onClearFilter();
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    onClearFilter();
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
            const selectedQuarterCategory = rates.find((item) => item.id === rowId);

            if (selectedQuarterCategory) {
              onEditRow(selectedQuarterCategory);
            }
          }}
          textClass="text-dark-blue"
        />
        <ActionButton
          icon={commonIcons.chevronRight}
          label="Lihat"
          disabled={Boolean(pendingAction)}
          onClick={() => {
            const selectedQuarterCategory = rates.find((item) => item.id === rowId);

            if (selectedQuarterCategory) {
              onViewRow(selectedQuarterCategory);
            }
          }}
          textClass="text-grey"
        />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      <div className="flex flex-row justify-between px-3 pt-3">
        <div>
          <div className="text-lg font-bold text-dark-grey">
            Senarai Kategori Kuarters
          </div>
          <div className="text-xs text-grey">
            Kemaskini maklumat yuran dan denda mengikut kategori kuarters.
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ToolbarButton
            icon={commonIcons.search}
            label="Cari kategori kuarters"
            isActive={isSearchOpen}
            onClick={handleToggleSearch}
          />
          <ToolbarButton
            icon={commonIcons.download}
            label="Muat turun data kategori kuarters"
            onClick={() => downloadQuarterCategoryRates(exportRates)}
          />
        </div>
      </div>

      {isSearchOpen ? (
      <div className="px-3">
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-grey">
                Carian Mengikut Kategori Atau Alamat
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-light-grey/30 bg-background px-3 py-2 transition-colors focus-within:border-dark-blue">
                <Icon
                  icon={commonIcons.search}
                  size={18}
                  className="text-light-grey"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={filterQuery}
                  onChange={(event) => onFilterQueryChange(event.target.value)}
                  placeholder="Contoh: Kategori A"
                  className="w-full border-none bg-transparent text-sm font-medium text-dark-grey outline-none placeholder:text-light-grey"
                />
              </div>
            </label>

            <div className="flex items-center gap-3 self-start lg:self-end">
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!hasActiveFilters}
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
          {/* The table stays semantic so the edit and add flows can grow without changing the layout structure. */}
          <table className="w-full">
            <thead className="bg-background">
              <tr className="font-bold text-xs text-grey bg-background">
                <th className="p-3 text-left w-min whitespace-nowrap">Kategori</th>
                <th className="p-3 text-left w-min whitespace-nowrap">Alamat</th>
                <th className="p-3 text-right w-min whitespace-nowrap">Sewa (RM)</th>
                <th className="p-3 text-right w-min whitespace-nowrap">Senggara (RM)</th>
                <th className="p-3 text-right w-min whitespace-nowrap">Penalti (RM)</th>
                <th className="w-[0%] p-3 text-center whitespace-nowrap">Tindakan</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isCreateRowVisible ? (
                <tr
                  ref={editor?.mode === "create" ? editingRowRef : null}
                  className="border-t border-light-grey/20 bg-dark-blue/3"
                >
                  <td className="px-6 py-4 w-min whitespace-nowrap">
                    <InputField
                      value={editor.draft.categoryName}
                      placeholder="Masukkan Nama Kategori"
                      align="start"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("categoryName", value)}
                    />
                  </td>
                  <td className="px-6 py-4 w-min whitespace-nowrap">
                    <InputField
                      value={editor.draft.address}
                      placeholder="Masukkan Alamat"
                      align="start"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("address", value)}
                    />
                  </td>
                  <td className="px-6 py-4 w-min whitespace-nowrap">
                    <InputField
                      value={editor.draft.rentalPrice}
                      placeholder="0.00"
                      align="end"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("rentalPrice", value)}
                    />
                  </td>
                  <td className="px-6 py-4 w-min whitespace-nowrap">
                    <InputField
                      value={editor.draft.maintenancePrice}
                      placeholder="0.00"
                      align="end"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) =>
                        onDraftChange("maintenancePrice", value)
                      }
                    />
                  </td>
                  <td className="px-6 py-4 w-min whitespace-nowrap">
                    <InputField
                      value={editor.draft.penaltyPrice}
                      placeholder="0.00"
                      align="end"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("penaltyPrice", value)}
                    />
                  </td>
                  <td className="px-6 py-4 w-min whitespace-nowrap">
                    <div className="flex justify-center">
                      {renderActionCell(EMPTY_QUARTER_CATEGORY_ID, true)}
                    </div>
                  </td>
                </tr>
              ) : null}

              {rates.length === 0 && !isCreateRowVisible ? (
                <tr className="border-t border-light-grey/20">
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-sm font-medium text-grey"
                  >
                    {isLoading ? (
                      "Sedang membaca data kategori kuarters..."
                    ) : hasActiveFilters ? (
                      "Tiada kategori kuarters yang sepadan dengan tapisan semasa."
                    ) : (
                      "Tiada kategori kuarters untuk dipaparkan buat masa ini."
                    )}
                  </td>
                </tr>
              ) : null}

              {!isLoading && rates.map((rate) => {
                const isEditing = editor?.mode === "edit" && editor.rowId === rate.id;
                const isCurrentRowPending = pendingRowId === rate.id;

                return (
                  <tr
                    key={rate.id}
                    ref={isEditing ? editingRowRef : null}
                    className="border-t border-light-grey/20"
                  >
                    <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <InputField
                          value={editor.draft.categoryName}
                          placeholder="Masukkan Nama Kategori"
                          align="start"
                          disabled={isCurrentRowPending}
                          onChange={(value) =>
                            onDraftChange("categoryName", value)
                          }
                        />
                      ) : (
                        <>
                          <span
                            className="block truncate"
                            title={rate.categoryName}
                          >
                            {rate.categoryName}
                          </span>
                          <span className="block text-[11px] font-medium text-grey">
                            {rate.unitCount} unit
                          </span>
                        </>
                      )}
                    </td>
                    <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <InputField
                          value={editor.draft.address}
                          placeholder="Masukkan Alamat"
                          align="start"
                          disabled={isCurrentRowPending}
                          onChange={(value) => onDraftChange("address", value)}
                        />
                      ) : (
                        <span
                          className="block truncate"
                          title={rate.address ?? "N/A"}
                        >
                          {rate.address ?? "N/A"}
                        </span>
                      )}
                    </td>
                    <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <InputField
                          value={editor.draft.rentalPrice}
                          placeholder="0.00"
                          align="end"
                          inputMode="decimal"
                          disabled={isCurrentRowPending}
                          onChange={(value) =>
                            onDraftChange("rentalPrice", value)
                          }
                        />
                      ) : (
                        <span className="block truncate text-right">
                          {formatMoney(rate.rentalPrice)}
                        </span>
                      )}
                    </td>
                    <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <InputField
                          value={editor.draft.maintenancePrice}
                          placeholder="0.00"
                          align="end"
                          inputMode="decimal"
                          disabled={isCurrentRowPending}
                          onChange={(value) =>
                            onDraftChange("maintenancePrice", value)
                          }
                        />
                      ) : (
                        <span className="block truncate text-right">
                          {formatMoney(rate.maintenancePrice)}
                        </span>
                      )}
                    </td>
                    <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <InputField
                          value={editor.draft.penaltyPrice}
                          placeholder="0.00"
                          align="end"
                          inputMode="decimal"
                          disabled={isCurrentRowPending}
                          onChange={(value) =>
                            onDraftChange("penaltyPrice", value)
                          }
                        />
                      ) : (
                        <span className="block truncate text-right">
                          {formatMoney(rate.penaltyPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 w-min whitespace-nowrap">
                      <div className="flex justify-center">
                        {renderActionCell(rate.id, isEditing)}
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
        onClick={onAddRow}
      >
        <Icon icon="add" size={15} />
        <span className="font-bold text-xs">Tambah Kategori</span>
      </button>
    </section>
  );
}
