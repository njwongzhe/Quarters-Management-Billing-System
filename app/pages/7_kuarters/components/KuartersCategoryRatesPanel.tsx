"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  TableInputField,
} from "@/app/components/InputField";
import SearchBar, { SearchBarToggleButton, useSearchBarLogic } from "@/app/components/SearchBar";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import { PaginationControls, usePaginationLogic } from "@/app/components/Pagination/Pagination";
import ToolbarButton from "@/app/components/ToolbarIconButton";
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
  editor: KuartersEditorState | null;
  filterQuery: string;
  hasActiveFilters: boolean;
  onCancelEdit: () => void;
  pendingAction: "save" | "delete" | null;
  pendingRowId: string | null;
  onAddRow: () => void;
  onClearFilter: () => void;
  onDeleteRow: (rowId: string) => void;
  onDraftChange: (field: keyof QuarterCategoryDraft, value: string) => void;
  onEditRow: (quarterCategory: QuarterCategoryRecord) => void;
  onFilterQueryChange: (value: string) => void;
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
    >
      <Icon icon={icon} size={18} />
    </button>
  );
}

export default function KuartersCategoryRatesPanel({
  isLoading,
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
  onSaveRow,
  onViewRow,
  pendingAction,
  pendingRowId,
  rates,
}: KuartersCategoryRatesPanelProps) {
  const itemsPerPage = 10;
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
  } = usePaginationLogic(rates.length, itemsPerPage);
  const paginatedRates = rates.slice(startIndex, endIndex);

  const isCreateRowVisible = editor?.mode === "create";
  const editingRowRef = useRef<HTMLTableRowElement | null>(null);

  const {
    isOpen: isSearchOpen,
    isSearchActive: isSearchFilterActive,
    searchInputRef,
    handleToggleSearch,
    handleClearSearch,
  } = useSearchBarLogic({ value: filterQuery, onChange: onFilterQueryChange });

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

  // Search logic is handled by useSearchBarLogic hook

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
      <div className="flex flex-col gap-3 px-3">
        <div className="flex flex-row justify-between pt-3">
          <div>
            <div className="text-lg font-bold text-dark-grey">
              Senarai Kategori Kuarters
            </div>
            <div className="text-xs text-grey">
              Kemaskini maklumat yuran dan denda mengikut kategori kuarters.
            </div>
          </div>

          <div className="flex items-center gap-4">
            <SearchBarToggleButton
              label="Cari kategori kuarters"
              isOpen={isSearchOpen}
              onToggle={handleToggleSearch}
            />
            <ToolbarButton
              icon={commonIcons.download}
              disabled={isLoading}
              label="Muat turun data kategori kuarters"
              onClick={() => downloadQuarterCategoryRates(exportRates)}
            />
          </div>
        </div>

        {isSearchOpen ? (
          <SearchBar
            value={filterQuery}
            onChange={onFilterQueryChange}
            onClear={handleClearSearch}
            label="CARIAN MENGIKUT KATEGORI ATAU ALAMAT"
            placeholder="Contoh: Kategori A"
            inputRef={searchInputRef}
          />
        ) : null}
      </div>

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
              {isLoading
                ? loadingTableRows({
                    mode: "loading",
                    columnCount: 6,
                    rowCount: 10,
                  })
                : null}

              {isCreateRowVisible ? (
                <tr
                  ref={editor?.mode === "create" ? editingRowRef : null}
                  className="border-t border-light-grey/20 bg-dark-blue/3"
                >
                  <td className="px-3 py-4 w-min whitespace-nowrap">
                    <TableInputField
                      value={editor.draft.categoryName}
                      placeholder="Masukkan Nama Kategori"
                      align="start"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("categoryName", value)}
                    />
                  </td>
                  <td className="px-3 py-4 w-min whitespace-nowrap">
                    <TableInputField
                      value={editor.draft.address}
                      placeholder="Masukkan Alamat"
                      align="start"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("address", value)}
                    />
                  </td>
                  <td className="px-3 py-4 w-min whitespace-nowrap">
                    <TableInputField
                      value={editor.draft.rentalPrice}
                      placeholder="0.00"
                      align="end"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("rentalPrice", value)}
                    />
                  </td>
                  <td className="px-3 py-4 w-min whitespace-nowrap">
                    <TableInputField
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
                  <td className="px-3 py-4 w-min whitespace-nowrap">
                    <TableInputField
                      value={editor.draft.penaltyPrice}
                      placeholder="0.00"
                      align="end"
                      inputMode="decimal"
                      disabled={pendingRowId === EMPTY_QUARTER_CATEGORY_ID}
                      onChange={(value) => onDraftChange("penaltyPrice", value)}
                    />
                  </td>
                  <td className="px-3 py-4 w-min whitespace-nowrap">
                    <div className="flex justify-center">
                      {renderActionCell(EMPTY_QUARTER_CATEGORY_ID, true)}
                    </div>
                  </td>
                </tr>
              ) : null}

              {rates.length === 0 && !isCreateRowVisible ? (
                isLoading
                  ? null
                  : loadingTableRows({
                      mode: "message",
                      columnCount: 6,
                      rowCount: 1,
                      message: hasActiveFilters
                        ? "Tiada kategori kuarters yang sepadan dengan tapisan semasa."
                        : "Tiada kategori kuarters untuk dipaparkan buat masa ini.",
                    })
              ) : null}

              {!isLoading && paginatedRates.map((rate) => {
                const isEditing = editor?.mode === "edit" && editor.rowId === rate.id;
                const isCurrentRowPending = pendingRowId === rate.id;

                return (
                  <tr
                    key={rate.id}
                    ref={isEditing ? editingRowRef : null}
                    className={`border-t border-light-grey/20 transition-colors ${isEditing ? "bg-dark-blue/3" : "hover:bg-background/60 cursor-pointer select-text"}`}
                    onDoubleClick={() => {
                      if (!isEditing && !pendingAction) {
                        onViewRow(rate);
                      }
                    }}
                  >
                    <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <TableInputField
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
                        <TableInputField
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
                        <TableInputField
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
                        <TableInputField
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
                        <TableInputField
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
            totalRecords={rates.length}
            onPageChange={handlePageChange}
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
