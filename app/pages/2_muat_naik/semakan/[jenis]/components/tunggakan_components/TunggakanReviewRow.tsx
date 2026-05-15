import Icon from "../../../../../../components/Icon";
import type { ExtractedTunggakanRecord } from "../../../../components/extract-review-shared";

type TunggakanReviewRowProps = {
  row: ExtractedTunggakanRecord;
  draft: ExtractedTunggakanRecord;
  isEditing: boolean;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  onDraftFieldChange: (
    field: "nama" | "noKadPengenalan" | "jumlahTunggakan",
    value: string,
  ) => void;
  onSave: () => void;
  onDelete: () => void;
  onEdit: () => void;
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

export default function TunggakanReviewRow({
  row,
  draft,
  isEditing,
  isSelected,
  onSelectionChange,
  onDraftFieldChange,
  onSave,
  onDelete,
  onEdit,
}: TunggakanReviewRowProps) {
  return (
    <tr
      data-tunggakan-editor={isEditing ? "true" : undefined}
      className={[
        "border-t border-light-grey/20 transition-colors",
        row.importStatus === "IGNORED" ? "bg-amber-50" : "hover:bg-background/60",
      ].join(" ")}
    >
      <td className="w-10 whitespace-nowrap px-3 py-2 text-left">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={row.importStatus === "IGNORED"}
          className="h-4 w-4 accent-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
          onChange={(event) => onSelectionChange(event.target.checked)}
        />
      </td>
      <td className="w-min whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-dark-grey">
        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <input
              className="min-h-9 w-full min-w-40 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
              value={draft.nama}
              onChange={(event) => onDraftFieldChange("nama", event.target.value)}
            />
          ) : (
            <span className="block truncate font-medium text-dark-grey" title={row.nama}>
              {row.nama || "-"}
            </span>
          )}
        </div>
        {row.importMessage && !isEditing ? (
          <p className="mt-1 text-[10px] font-semibold text-[#B54708]" title={row.importMessage}>
            {row.importMessage}
          </p>
        ) : null}
      </td>
      <td className="overflow-hidden px-3 py-3.5 text-xs font-medium text-dark-grey">
        {isEditing ? (
          <input
            className="min-h-9 w-full min-w-32 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
            value={draft.noKadPengenalan}
            onChange={(event) =>
              onDraftFieldChange("noKadPengenalan", event.target.value)
            }
          />
        ) : (
          <span
            className="block truncate font-medium text-dark-grey"
            title={row.noKadPengenalan || "-"}
          >
            {row.noKadPengenalan || "-"}
          </span>
        )}
      </td>
      <td className="px-3 py-3.5 text-center text-xs font-medium text-dark-grey">
        {isEditing ? (
          <input
            className="min-h-9 w-full min-w-24 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-center text-xs font-medium text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue"
            inputMode="decimal"
            placeholder="0.00"
            value={draft.jumlahTunggakan}
            onChange={(event) =>
              onDraftFieldChange("jumlahTunggakan", event.target.value)
            }
          />
        ) : (
          <span className="block text-center font-medium text-dark-grey">
            {formatTunggakanAmount(row.jumlahTunggakan)}
          </span>
        )}
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <>
              <ActionButton
                icon="save"
                label="Simpan perubahan tunggakan"
                textClass="text-green"
                onClick={onSave}
              />
              <ActionButton
                icon="delete"
                label="Padam tunggakan"
                textClass="text-red"
                onClick={onDelete}
              />
            </>
          ) : (
            <ActionButton
              icon="edit"
              label="Edit tunggakan"
              textClass="text-dark-blue"
              onClick={onEdit}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function formatTunggakanAmount(value: string) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "0.00";
  }

  const normalizedSign = normalizedValue.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalizedSign);
  const isNegative = normalizedSign.includes("-") || isParenthesizedNegative;
  const numericValue = Number(
    normalizedSign
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(numericValue)) {
    return normalizedValue;
  }

  const formattedValue = numericValue.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative && numericValue > 0 ? `-${formattedValue}` : formattedValue;
}
