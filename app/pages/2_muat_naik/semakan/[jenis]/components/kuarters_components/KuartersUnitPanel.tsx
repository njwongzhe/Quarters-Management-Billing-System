import Icon from "../../../../../../components/Icon";
import {
  type ExtractedQuarterUnit,
  Pagination,
} from "../../../../components/extract-review-shared";
import { getUnitKey } from "./helpers";

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
  onCancelEdit: () => void;
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
      onClick={() => {
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
  onCancelEdit,
}: KuartersUnitPanelProps) {
  const hasSelectableUnits = units.some(isSelectableUnit);

  return (
    <div className="border-t border-light-grey/20 bg-white lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between bg-background px-4 py-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
        Senarai Unit
      </div>
      <div className="grid grid-cols-[32px_minmax(0,120px)_1fr] border-t border-light-grey/20 bg-background px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
        <input
          type="checkbox"
          aria-label="Pilih semua unit kategori ini"
          checked={isAllSelected}
          disabled={isSaving || !hasSelectableUnits}
          className="h-4 w-4 accent-dark-blue"
          onChange={(event) => onToggleAllUnits(event.target.checked)}
        />
        <span>ID Unit</span>
        <span className="text-center">Tindakan</span>
      </div>
      {pageUnits.length === 0 ? (
        <div className="border-t border-light-grey/20 px-5 py-10 text-center text-xs font-semibold text-grey">
          Tiada unit baharu.
        </div>
      ) : (
        pageUnits.map((unit) => {
          const unitKey = getUnitKey(unit);
          const isEditing = editingUnitKey === unitKey;
          const isSavingUnit = savingUnitKey === unitKey;
          const isSelectable = isSelectableUnit(unit);

          return (
            <div
              key={unitKey}
              data-kuarters-editor={isEditing ? "true" : undefined}
              className={[
                "grid grid-cols-[32px_minmax(0,120px)_1fr] items-center border-t border-light-grey/20 px-4 py-3.5 text-xs transition-colors",
                unit.isExisted ? "bg-amber-50" : "hover:bg-background/60",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={isSelectable && selectedKeys.has(unitKey)}
                disabled={isSaving || !isSelectable}
                className="h-4 w-4 accent-dark-blue"
                onChange={(event) => onToggleUnit(unitKey, event.target.checked)}
              />
              <span>
                {isEditing ? (
                  <input
                    className="min-h-8 w-full rounded-lg border border-light-grey/35 bg-white px-3 py-1.5 text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
                    placeholder="Masukkan kod unit"
                    value={unitDrafts[unitKey] ?? unit.unitCode}
                    disabled={isSaving}
                    aria-busy={isSavingUnit}
                    onChange={(event) =>
                      onDraftsChange((currentDrafts) => ({
                        ...currentDrafts,
                        [unitKey]: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <span className="block truncate font-medium text-dark-grey">
                    {unit.unitCode}
                  </span>
                )}
              </span>
              <span className="flex justify-center gap-1">
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
                      label="Batal edit unit"
                      textClass="text-red"
                      disabled={isSaving}
                      onClick={onCancelEdit}
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
              </span>
            </div>
          );
        })
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        label={`Memaparkan ${displayStart}-${displayEnd} daripada ${units.length} Unit`}
        showLabel={false}
        size="compact"
      />
    </div>
  );
}

function isSelectableUnit(unit: ExtractedQuarterUnit) {
  return !unit.isExisted && !unit.originalUnitId;
}
