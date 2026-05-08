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
  currentPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  onPageChange: (page: number) => void;
  onDraftsChange: (updater: (currentDrafts: Record<string, string>) => Record<string, string>) => void;
  onStartEdit: (unitKey: string, unitCode: string) => void;
  onSaveUnit: (unitKey: string) => Promise<void>;
  onCancelEdit: () => void;
};

function ActionButton({
  icon,
  label,
  textClass,
  onClick,
}: {
  icon: string;
  label: string;
  textClass: string;
  onClick?: () => void;
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

export default function KuartersUnitPanel({
  units,
  pageUnits,
  unitDrafts,
  editingUnitKey,
  currentPage,
  totalPages,
  displayStart,
  displayEnd,
  onPageChange,
  onDraftsChange,
  onStartEdit,
  onSaveUnit,
  onCancelEdit,
}: KuartersUnitPanelProps) {
  return (
    <div className="border-t border-light-grey/20 bg-white lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between bg-background px-4 py-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
        Senarai Unit
      </div>
      <div className="grid grid-cols-[minmax(0,120px)_1fr] border-t border-light-grey/20 bg-background px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
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

          return (
            <div
              key={unitKey}
              data-kuarters-editor={isEditing ? "true" : undefined}
              className="grid grid-cols-[minmax(0,120px)_1fr] items-center border-t border-light-grey/20 px-4 py-3.5 text-xs transition-colors hover:bg-background/60"
            >
              <span>
                {isEditing ? (
                  <input
                    className="min-h-8 w-full rounded-lg border border-light-grey/35 bg-white px-3 py-1.5 text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
                    placeholder="Masukkan kod unit"
                    value={unitDrafts[unitKey] ?? unit.unitCode}
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
                      icon="save"
                      label="Simpan perubahan unit"
                      textClass="text-green"
                      onClick={() => {
                        void onSaveUnit(unitKey);
                      }}
                    />
                    <ActionButton
                      icon="delete"
                      label="Batal edit unit"
                      textClass="text-red"
                      onClick={onCancelEdit}
                    />
                  </>
                ) : (
                  <ActionButton
                    icon="edit"
                    label="Edit unit"
                    textClass="text-dark-blue"
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
