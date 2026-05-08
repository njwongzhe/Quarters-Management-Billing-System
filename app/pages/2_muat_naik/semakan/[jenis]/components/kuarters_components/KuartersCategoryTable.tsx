import Icon from "../../../../../../components/Icon";
import {
  type ExtractedQuarterRecord,
  Pagination,
} from "../../../../components/extract-review-shared";
import { getKuartersRecordKey } from "./helpers";
import type { KuartersCategoryDraft, KuartersPriceField } from "./types";

type KuartersCategoryTableProps = {
  categories: ExtractedQuarterRecord[];
  pageCategories: ExtractedQuarterRecord[];
  selectedCategoryId: string;
  selectedKeys: Set<string>;
  isAllSelected: boolean;
  editingCategoryId: string | null;
  categoryDrafts: Record<string, KuartersCategoryDraft>;
  currentPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  onPageChange: (page: number) => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleCategory: (categoryKey: string, checked: boolean) => void;
  onToggleAllCategories: (checked: boolean) => void;
  onStartEdit: (category: ExtractedQuarterRecord) => void;
  onUpdateDraft: (
    categoryId: string,
    field: KuartersPriceField,
    value: string,
  ) => void;
  onSaveCategory: (categoryId: string) => Promise<void>;
  onCancelEdit: () => void;
};

const priceFields: Array<[KuartersPriceField, string, string]> = [
  ["categoryName", "Kategori", "w-[22%]"],
  ["address", "Alamat", "w-[28%]"],
  ["rentalPrice", "Sewa (RM)", "w-[13%]"],
  ["maintenancePrice", "Senggara (RM)", "w-[14%]"],
  ["penaltyPrice", "Penalti (RM)", "w-[13%]"],
];

function ActionButton({
  icon,
  label,
  textClass,
  onClick,
}: {
  icon: string;
  label: string;
  textClass: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background ${textClass}`}
      onClick={onClick}
    >
      <Icon icon={icon} size={18} />
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
  onCancelEdit,
}: KuartersCategoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-200 table-fixed border-collapse text-left">
        <thead className="bg-background">
          <tr>
            <th className="w-10 px-3 py-4">
              <input
                type="checkbox"
                aria-label="Pilih semua rekod kuarters"
                checked={isAllSelected}
                className="h-4 w-4 accent-dark-blue"
                onChange={(event) => onToggleAllCategories(event.target.checked)}
              />
            </th>
            {priceFields.map(([, label, widthClass]) => (
              <th
                key={label}
                className={[
                  widthClass,
                  "px-3 py-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey",
                  label.includes("RM") ? "text-center" : "text-left",
                ].join(" ")}
              >
                {label}
              </th>
            ))}
            <th className="w-24 px-3 py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Tindakan
            </th>
          </tr>
        </thead>
        <tbody>
          {pageCategories.length === 0 ? (
            <tr className="border-t border-light-grey/20">
              <td
                colSpan={7}
                className="px-6 py-10 text-center text-xs font-semibold text-grey"
              >
                Tiada kategori atau unit kuarters baharu ditemui.
              </td>
            </tr>
          ) : (
            pageCategories.map((category) => {
              const isSelected = category.id === selectedCategoryId;
              const selectionKey = getKuartersRecordKey(category);
              const isEditing = editingCategoryId === category.id;

              return (
                <tr
                  key={category.id}
                  data-kuarters-editor={isEditing ? "true" : undefined}
                  className={[
                    "border-t border-light-grey/20 transition-colors",
                    isSelected ? "bg-dark-blue/3" : "hover:bg-background/60",
                  ].join(" ")}
                  onClick={() => onSelectCategory(category.id)}
                >
                  <td className="px-3 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(selectionKey)}
                      className="h-4 w-4 accent-dark-blue"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onToggleCategory(selectionKey, event.target.checked)
                      }
                    />
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
                          "overflow-hidden px-3 py-3.5 text-xs font-medium text-dark-grey",
                          isMoneyField ? "text-center" : "",
                        ].join(" ")}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode={isMoneyField ? "decimal" : "text"}
                            className={[
                              "min-h-9 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue",
                              isMoneyField
                                ? "w-full min-w-22 text-center"
                                : "w-full min-w-28 text-left",
                            ].join(" ")}
                            placeholder={isMoneyField ? "0.00" : "Masukkan maklumat"}
                            value={draftValue}
                            onChange={(event) =>
                              onUpdateDraft(category.id, field, event.target.value)
                            }
                          />
                        ) : (
                          <>
                            <span
                              className={[
                                "block truncate font-medium text-dark-grey",
                                isMoneyField ? "text-center" : "",
                              ].join(" ")}
                              title={String(value || "-")}
                            >
                              {isMoneyField ? formatPrice(value) : value || "-"}
                            </span>
                            {field === "categoryName" ? (
                              <span className="block text-[10px] font-medium text-grey">
                                {category.unitCount} unit
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      {isEditing ? (
                        <>
                          <ActionButton
                            icon="save"
                            label="Simpan perubahan kategori"
                            textClass="text-green"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onSaveCategory(category.id);
                            }}
                          />
                          <ActionButton
                            icon="delete"
                            label="Padam kategori"
                            textClass="text-red"
                            onClick={(event) => event.stopPropagation()}
                          />
                          <ActionButton
                            icon="chevron_left"
                            label="Sembunyikan senarai unit"
                            textClass="text-grey"
                            onClick={(event) => {
                              event.stopPropagation();
                              onCancelEdit();
                            }}
                          />
                        </>
                      ) : (
                        <ActionButton
                          icon="edit"
                          label="Edit kategori"
                          textClass="text-dark-blue"
                          onClick={(event) => {
                            event.stopPropagation();
                            onStartEdit(category);
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        label={`Memaparkan ${displayStart}-${displayEnd} daripada ${categories.length} Kategori`}
      />
    </div>
  );
}
