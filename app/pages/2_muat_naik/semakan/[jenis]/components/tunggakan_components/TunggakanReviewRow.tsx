import Icon from "../../../../../../components/Icon/Icon";
import type { ExtractedTunggakanRecord } from "../../../../components/extract-review-shared";
import { TableInputField, TableInputFieldFormat } from "@/app/components/InputField";

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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
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
        "border-t border-light-grey/20 transition-colors cursor-pointer select-text",
        row.importStatus === "IGNORED"
          ? "bg-amber-50"
          : isEditing
            ? "bg-dark-blue/3"
            : "hover:bg-background/60",
      ].join(" ")}
      onDoubleClick={() => {
        if (!isEditing) {
          onEdit();
        }
      }}
    >
      {/* Checkbox Column */}
      <td className="w-10 whitespace-nowrap px-3 text-center">
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={row.importStatus === "IGNORED"}
            className="h-4 w-4 accent-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
            onClick={(e) => e.stopPropagation()}
            onChange={(event) => onSelectionChange(event.target.checked)}
          />
        </div>
      </td>

      {/* Name */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputField
              value={draft.nama}
              placeholder="Masukkan Nama Penghuni"
              align="start"
              onChange={(value) => onDraftFieldChange("nama", value)}
            />
          </div>
        ) : (
          <span className="block truncate font-semibold text-dark-grey" title={row.nama}>
            {row.nama || "-"}
          </span>
        )}
        {row.importMessage && !isEditing ? (
          <p className="mt-1 text-[10px] font-semibold text-[#B54708]" title={row.importMessage}>
            {row.importMessage}
          </p>
        ) : null}
      </td>

      {/* No. Kad Pengenalan */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputFieldFormat
              value={draft.noKadPengenalan}
              placeholder="Masukkan No. Kad Pengenalan"
              align="start"
              format="######-##-####"
              onChange={(value) => onDraftFieldChange("noKadPengenalan", value)}
            />
          </div>
        ) : (
          <span
            className="block truncate font-semibold text-dark-grey"
            title={row.noKadPengenalan || "-"}
          >
            {row.noKadPengenalan && row.noKadPengenalan.length === 12
              ? row.noKadPengenalan.replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3")
              : row.noKadPengenalan || "-"}
          </span>
        )}
      </td>

      {/* Jumlah Tunggakan */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputField
              value={draft.jumlahTunggakan}
              placeholder="0.00"
              align="end" 
              inputMode="decimal"
              onChange={(value) => onDraftFieldChange("jumlahTunggakan", value)}
            />
          </div>
        ) : (
          <span className="block text-right font-semibold text-dark-grey">
            {formatTunggakanAmount(row.jumlahTunggakan)}
          </span>
        )}
      </td>

      {/* Action Buttons */}
      <td className={`w-[0%] px-3 w-min whitespace-nowrap ${isEditing ? "py-4" : "py-2"}`}>
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <div className="flex items-center justify-center gap-1">
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
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <ActionButton
                icon="edit"
                label="Edit tunggakan"
                textClass="text-dark-blue"
                onClick={onEdit}
              />
            </div>
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
