import Icon from "../../../../../../components/Icon/Icon";
import {
  type ExtractedQuarterRecord,
} from "../../../../components/extract-review-shared";
import { getKuartersRecordKey } from "./helpers";
import type { KuartersCategoryDraft, KuartersPriceField } from "./types";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import { PaginationControls } from "@/app/components/Pagination/Pagination";
import { TableInputField } from "@/app/components/InputField";


type KuartersCategoryTableProps = {
  categories: ExtractedQuarterRecord[];
  pageCategories: ExtractedQuarterRecord[];
  selectedCategoryId: string;
  selectedKeys: Set<string>;
  isAllSelected: boolean;
  editingCategoryId: string | null;
  savingCategoryId: string | null;
  isSaving: boolean;
  categoryDrafts: Record<string, KuartersCategoryDraft>;
  currentPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  onPageChange: (page: number) => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleCategory: (category: ExtractedQuarterRecord, checked: boolean) => void;
  onToggleAllCategories: (checked: boolean) => void;
  onStartEdit: (category: ExtractedQuarterRecord) => void;
  onUpdateDraft: (
    categoryId: string,
    field: KuartersPriceField,
    value: string,
  ) => void;
  onSaveCategory: (categoryId: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onCancelEdit: () => void;
  isLoading?: boolean;
};

const priceFields: Array<[KuartersPriceField, string, string]> = [
  ["categoryName", "Kategori", "w-min whitespace-nowrap"],
  ["address", "Alamat", "w-max whitespace-nowrap"],
  ["rentalPrice", "Sewa (RM)", "w-min whitespace-nowrap"],
  ["maintenancePrice", "Senggara (RM)", "w-min whitespace-nowrap"],
  ["penaltyPrice", "Penalti (RM)", "w-min whitespace-nowrap"],
];


function ActionButton({
  icon,
  label,
  textClass,
  iconClass,
  onClick,
  disabled = false,
}: {
  icon: string;
  label: string;
  textClass: string;
  iconClass?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-35 ${textClass}`}
      onClick={(event) => {
        if (disabled) {
          event.stopPropagation();
          return;
        }

        onClick(event);
      }}
    >
      <Icon icon={icon} size={18} className={iconClass} />
    </button>
  );
}

function formatPrice(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
}

export default function KuartersCategoryTable({
  categories,
  pageCategories,
  selectedCategoryId,
  selectedKeys,
  isAllSelected,
  editingCategoryId,
  savingCategoryId,
  isSaving,
  categoryDrafts,
  currentPage,
  totalPages,
  displayStart,
  displayEnd,
  onPageChange,
  onSelectCategory,
  onToggleCategory,
  onToggleAllCategories,
  onStartEdit,
  onUpdateDraft,
  onSaveCategory,
  onDeleteCategory,
  onCancelEdit,
  isLoading = false,
}: KuartersCategoryTableProps) {
  return (
    <div className="bg-white flex flex-col justify-between h-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-200 border-collapse text-left">
          <thead className="bg-background">
            <tr className="font-bold text-xs text-grey bg-background border-b border-light-grey/20">
              <th colSpan={7} className="px-4 py-4 uppercase tracking-[0.18em] font-extrabold text-[10px] text-grey">
                Senarai Kuarters
              </th>
            </tr>

            {/* Header */}
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="p-3 w-[0%] text-center bg-background">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua rekod kuarters"
                    checked={isAllSelected}
                    disabled={isSaving}
                    className="h-4 w-4 accent-dark-blue"
                    onChange={(event) => onToggleAllCategories(event.target.checked)}
                  />
                </div>
              </th>
              <th className="w-[0%] p-3 text-left whitespace-nowrap bg-background">Kategori</th>
              <th className="p-3 text-left w-max whitespace-nowrap bg-background">Alamat</th>
              <th className="w-[0%] p-3 text-right whitespace-nowrap bg-background">Sewa (RM)</th>
              <th className="w-[0%] p-3 text-right whitespace-nowrap bg-background">Senggara (RM)</th>
              <th className="w-[0%] p-3 text-right whitespace-nowrap bg-background">Penalti (RM)</th>
              <th className="w-[0%] p-3 text-center whitespace-nowrap bg-background">Tindakan</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white">
            {isLoading ? (
              loadingTableRows({
                mode: "loading",
                columnCount: 7,
                rowCount: 10,
              })
            ) : pageCategories.length === 0 ? (
              loadingTableRows({
                mode: "message",
                columnCount: 7,
                message: "Tiada kategori atau unit kuarters baharu ditemui.",
                rowCount: 1,
              })
            ) : (
              pageCategories.map((category) => {
                const isSelected = category.id === selectedCategoryId;
                const selectionKey = getKuartersRecordKey(category);
                const isEditing = editingCategoryId === category.id;
                const isSavingCategory = savingCategoryId === category.id;
                const canEditCategory = true;
                const isSelectable = !category.categoryIsExisted;

                return (
                  <tr
                    key={category.id}
                    data-kuarters-editor={isEditing ? "true" : undefined}
                    className={[
                      "border-t border-light-grey/20 transition-colors cursor-pointer select-text",
                      category.categoryIsExisted
                        ? "bg-amber-50"
                        : isSelected
                          ? "bg-dark-blue/3"
                          : "hover:bg-background/60",
                    ].join(" ")}
                    onClick={() => onSelectCategory(category.id)}
                    onDoubleClick={() => {
                      if (!isEditing && canEditCategory) {
                        onStartEdit(category);
                      }
                    }}
                  >
                    <td className="w-10 whitespace-nowrap px-3 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelectable && selectedKeys.has(selectionKey)}
                          disabled={isSaving || !isSelectable}
                          className="h-4 w-4 accent-dark-blue"
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            onToggleCategory(category, event.target.checked)
                          }
                        />
                      </div>
                    </td>
                    {priceFields.map(([field]) => {
                      const value = category[field];
                      const draftValue =
                        categoryDrafts[category.id]?.[field] ?? value ?? "";
                      const isMoneyField = field.endsWith("Price");

                      return (
                        <td
                          key={`${category.id}-${field}`}
                          className={[
                            "overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap",
                            isMoneyField ? "text-right" : "text-left",
                            isEditing ? "px-3 py-4" : "px-3 py-2",
                          ].join(" ")}
                        >
                          {isEditing ? (
                            <div onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
                              <TableInputField
                                value={draftValue}
                                placeholder={isMoneyField ? "0.00" : "Masukkan maklumat"}
                                align={isMoneyField ? "end" : "start"}
                                inputMode={isMoneyField ? "decimal" : "text"}
                                disabled={isSaving}
                                onChange={(value) => {
                                  onUpdateDraft(category.id, field, value);
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              {isMoneyField ? (
                                <span className="block text-right font-semibold text-dark-grey">
                                  {formatPrice(value)}
                                </span>
                              ) : (
                                <span
                                  className="block truncate font-semibold text-dark-grey text-left"
                                  title={String(value || "-")}
                                >
                                  {value || "-"}
                                </span>
                              )}
                              {field === "categoryName" ? (
                                <>
                                  <span className="block text-[10px] font-semibold text-grey text-left">
                                    {category.unitCount} unit
                                  </span>
                                  {category.categoryIsExisted ? (
                                    <p className="mt-1 text-[10px] font-semibold text-[#B54708] text-left">
                                      Kategori Sudah Ada
                                    </p>
                                  ) : null}
                                </>
                              ) : null}
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td className={`w-[0%] px-3 text-center whitespace-nowrap ${isEditing ? "py-4" : "py-2"}`}>
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <ActionButton
                              icon={isSavingCategory ? "progress_activity" : "save"}
                              label={
                                isSavingCategory
                                  ? "Menyimpan perubahan kategori"
                                  : "Simpan perubahan kategori"
                              }
                              textClass={isSavingCategory ? "text-dark-blue" : "text-green"}
                              iconClass={isSavingCategory ? "animate-spin" : undefined}
                              disabled={isSaving && !isSavingCategory}
                              onClick={(event) => {
                                event.stopPropagation();
                                void onSaveCategory(category.id);
                              }}
                            />
                            <ActionButton
                              icon="delete"
                              label="Padam kategori"
                              textClass="text-red"
                              disabled={isSaving}
                              onClick={(event) => {
                                event.stopPropagation();
                                void onDeleteCategory(category.id);
                              }}
                            />
                          </>
                        ) : (
                          <ActionButton
                            icon="edit"
                            label={
                              canEditCategory
                                ? "Edit kategori"
                                : "Edit kategori"
                            }
                            textClass={canEditCategory ? "text-dark-blue" : "text-grey"}
                            disabled={!canEditCategory || isSaving}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (canEditCategory) {
                                onStartEdit(category);
                              }
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-light-grey/20 bg-white p-3">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={displayStart > 0 ? displayStart - 1 : 0}
          endIndex={displayEnd}
          totalRecords={categories.length}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
