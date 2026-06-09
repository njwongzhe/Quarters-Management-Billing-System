import Icon from "../../../../../../components/Icon/Icon";
import {
  type ExtractedQuarterUnit,
} from "../../../../components/extract-review-shared";
import { getUnitKey } from "./helpers";
import { PaginationControls } from "@/app/components/Pagination/Pagination";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import { TableInputField } from "@/app/components/InputField";


type KuartersUnitPanelProps = {
  units: ExtractedQuarterUnit[];
  pageUnits: ExtractedQuarterUnit[];
  unitDrafts: Record<string, string>;
  editingUnitKey: string | null;
  savingUnitKey: string | null;
  isSaving: boolean;
  selectedKeys: Set<string>;
  isAllSelected: boolean;
  currentPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  onPageChange: (page: number) => void;
  onDraftsChange: (updater: (currentDrafts: Record<string, string>) => Record<string, string>) => void;
  onToggleUnit: (unitKey: string, checked: boolean) => void;
  onToggleAllUnits: (checked: boolean) => void;
  onStartEdit: (unitKey: string, unitCode: string) => void;
  onSaveUnit: (unitKey: string) => Promise<void>;
  onDeleteUnit: (unitKey: string) => Promise<void>;
  isLoading?: boolean;
};

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
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-35 ${textClass}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onClick?.();
        }
      }}
    >
      <Icon icon={icon} size={18} className={iconClass} />
    </button>
  );
}

export default function KuartersUnitPanel({
  units,
  pageUnits,
  unitDrafts,
  editingUnitKey,
  savingUnitKey,
  isSaving,
  selectedKeys,
  isAllSelected,
  currentPage,
  totalPages,
  displayStart,
  displayEnd,
  onPageChange,
  onDraftsChange,
  onToggleUnit,
  onToggleAllUnits,
  onStartEdit,
  onSaveUnit,
  onDeleteUnit,
  isLoading = false,
}: KuartersUnitPanelProps) {
  const hasSelectableUnits = units.some(isSelectableUnit);

  return (
    <div className="border-t border-light-grey/20 bg-white lg:border-l lg:border-t-0 flex flex-col justify-between h-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="bg-background">
            <tr className="font-bold text-xs text-grey bg-background border-b border-light-grey/20">
              <th colSpan={3} className="px-4 py-4 uppercase tracking-[0.18em] font-extrabold text-[10px] text-grey">
                Senarai Unit
              </th>
            </tr>
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="w-[0%] p-3 text-center bg-background">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua unit kategori ini"
                    checked={isAllSelected}
                    disabled={isSaving || !hasSelectableUnits}
                    className="h-4 w-4 accent-dark-blue"
                    onChange={(event) => onToggleAllUnits(event.target.checked)}
                  />
                </div>
              </th>
              <th className="p-3 font-bold text-xs text-grey bg-background text-left w-min whitespace-nowrap">ID Unit</th>
              <th className="w-[0%] p-3 text-center font-bold text-xs text-grey bg-background whitespace-nowrap">Tindakan</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              loadingTableRows({
                mode: "loading",
                columnCount: 3,
                rowCount: 10,
              })
            ) : pageUnits.length === 0 ? (
              loadingTableRows({
                mode: "message",
                columnCount: 3,
                rowCount: 1,
                message: "Tiada unit baharu.",
              })
            ) : (
              pageUnits.map((unit) => {
                const unitKey = getUnitKey(unit);
                const isEditing = editingUnitKey === unitKey;
                const isSavingUnit = savingUnitKey === unitKey;
                const isSelectable = isSelectableUnit(unit);

                return (
                  <tr
                    key={unitKey}
                    data-kuarters-editor={isEditing ? "true" : undefined}
                    className={[
                      "border-t border-light-grey/20 transition-colors cursor-pointer select-text",
                      unit.isExisted ? "bg-amber-50" : "hover:bg-background/60",
                    ].join(" ")}
                    onDoubleClick={() => {
                      if (!isEditing) {
                        onStartEdit(unitKey, unit.unitCode);
                      }
                    }}
                  >
                    <td className="w-10 whitespace-nowrap px-3 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelectable && selectedKeys.has(unitKey)}
                          disabled={isSaving || !isSelectable}
                          className="h-4 w-4 accent-dark-blue"
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => onToggleUnit(unitKey, event.target.checked)}
                        />
                      </div>
                    </td>
                    <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
                      {isEditing ? (
                        <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                          <TableInputField
                            value={unitDrafts[unitKey] ?? unit.unitCode}
                            placeholder="Masukkan kod unit"
                            align="start"
                            disabled={isSaving}
                            onChange={(value) =>
                              onDraftsChange((currentDrafts) => ({
                                ...currentDrafts,
                                [unitKey]: value,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <span className="block truncate font-semibold text-dark-grey text-left">
                          {unit.unitCode}
                        </span>
                      )}
                      {unit.isExisted && !isEditing ? (
                        <p className="mt-1 text-[10px] font-semibold text-[#B54708]">
                          Unit Sudah Ada
                        </p>
                      ) : null}
                    </td>
                    <td className={`w-[0%] px-3 text-center whitespace-nowrap ${isEditing ? "py-4" : "py-2"}`}>
                      <div className="flex justify-center gap-1">
                        {isEditing ? (
                          <>
                            <ActionButton
                              icon={isSavingUnit ? "progress_activity" : "save"}
                              label={
                                isSavingUnit
                                  ? "Menyimpan perubahan unit"
                                  : "Simpan perubahan unit"
                              }
                              textClass={isSavingUnit ? "text-dark-blue" : "text-green"}
                              iconClass={isSavingUnit ? "animate-spin" : undefined}
                              disabled={isSaving && !isSavingUnit}
                              onClick={() => {
                                void onSaveUnit(unitKey);
                              }}
                            />
                            <ActionButton
                              icon="delete"
                              label="Padam unit"
                              textClass="text-red"
                              disabled={isSaving}
                              onClick={() => {
                                void onDeleteUnit(unitKey);
                              }}
                            />
                          </>
                        ) : (
                          <ActionButton
                            icon="edit"
                            label="Edit unit"
                            textClass="text-dark-blue"
                            disabled={isSaving}
                            onClick={() => onStartEdit(unitKey, unit.unitCode)}
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
          totalRecords={units.length}
          onPageChange={onPageChange}
          isSimple={true}
        />
      </div>
    </div>
  );
}

function isSelectableUnit(unit: ExtractedQuarterUnit) {
  return !unit.isExisted && !unit.originalUnitId;
}
