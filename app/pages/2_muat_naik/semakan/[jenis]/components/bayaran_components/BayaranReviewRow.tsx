import Icon from "../../../../../../components/Icon/Icon";
import type { BayaranReviewRowModel } from "./types";

type BayaranReviewRowProps = {
  row: BayaranReviewRowModel;
  draft: BayaranReviewRowModel;
  isEditing: boolean;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  onDraftChange: (
    field:
      | "nama"
      | "noGajiNoKp"
      | "jabatanName"
      | "noRujukan"
      | "tarikh"
      | "amaunRm"
      | "catatan",
    value: string,
  ) => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
  onClick: () => void;
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

export default function BayaranReviewRow({
  row,
  draft,
  isEditing,
  isSelected,
  onSelectionChange,
  onDraftChange,
  onSave,
  onEdit,
  onDelete,
}: BayaranReviewRowProps) {
  return (
    <tr
      data-bayaran-editor={isEditing ? "true" : undefined}
      className={[
        "border-t border-light-grey/20 transition-colors",
        row.isExisted ? "bg-amber-50" : "hover:bg-background/60",
      ].join(" ")}
    >
      <td className="w-10 whitespace-nowrap px-3 py-3.5 text-left">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(event) => onSelectionChange(event.target.checked)}
          className="h-4 w-4 accent-dark-blue"
        />
      </td>
      <td className="overflow-hidden px-3 py-3.5 text-xs font-medium text-dark-grey">
        {isEditing ? (
          <EditInput
            value={draft.nama}
            onChange={(value) => onDraftChange("nama", value)}
          />
        ) : (
          <span className="block truncate font-medium text-dark-grey" title={displayValue(row.nama)}>
            {displayValue(row.nama)}
          </span>
        )}
      </td>
      <td className="overflow-hidden px-3 py-3.5 text-xs font-medium text-dark-grey">
        {isEditing ? (
          <EditInput
            value={draft.noGajiNoKp}
            onChange={(value) => onDraftChange("noGajiNoKp", value)}
          />
        ) : (
          <span
            className="block truncate font-medium text-dark-grey"
            title={displayValue(row.noGajiNoKp)}
          >
            {displayValue(row.noGajiNoKp)}
          </span>
        )}
      </td>
      <td className="overflow-hidden px-3 py-3.5 text-xs font-medium text-dark-grey">
        {isEditing ? (
          <EditInput
            value={draft.jabatanName}
            onChange={(value) => onDraftChange("jabatanName", value)}
          />
        ) : (
          <span
            className="block truncate font-medium text-dark-grey"
            title={displayValue(row.jabatanName)}
          >
            {displayValue(row.jabatanName)}
          </span>
        )}
      </td>
      <td className="overflow-hidden px-3 py-3.5 text-xs font-medium text-dark-grey">
        {isEditing ? (
          <EditInput
            value={draft.noRujukan}
            onChange={(value) => onDraftChange("noRujukan", value)}
          />
        ) : (
          <span
            className="block truncate font-medium text-dark-grey"
            title={displayValue(row.noRujukan)}
          >
            {displayValue(row.noRujukan)}
          </span>
        )}
      </td>
      <td className="overflow-hidden px-3 py-3.5 text-xs font-medium text-dark-grey">
        {isEditing ? (
          <input
            className="min-h-9 w-full min-w-32 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
            placeholder="Tambah catatan..."
            value={draft.catatan}
            onChange={(event) => onDraftChange("catatan", event.target.value)}
          />
        ) : (
          <span
            className="block truncate font-medium text-dark-grey"
            title={displayValue(row.catatan)}
          >
            {displayValue(row.catatan)}
          </span>
        )}
      </td>
      <td className="px-3 py-3.5 text-right text-xs font-medium text-dark-grey">
        {isEditing ? (
          <input
            className="min-h-9 w-full min-w-24 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-right text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
            value={draft.amaunRm}
            onChange={(event) => onDraftChange("amaunRm", event.target.value)}
          />
        ) : (
          <span className="font-medium text-dark-grey">{displayValue(row.amaunRm)}</span>
        )}
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <>
              <ActionButton
                icon="save"
                label="Simpan perubahan bayaran"
                textClass="text-green"
                onClick={onSave}
              />
              <ActionButton
                icon="delete"
                label="Padam bayaran"
                textClass="text-red"
                onClick={onDelete}
              />
            </>
          ) : (
            <ActionButton
              icon="edit"
              label="Edit bayaran"
              textClass="text-dark-blue"
              onClick={onEdit}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function EditInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="min-h-9 w-full min-w-32 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function displayValue(value: string | number | null | undefined) {
  const normalizedValue = String(value ?? "").trim();

  return normalizedValue || "N/A";
}
