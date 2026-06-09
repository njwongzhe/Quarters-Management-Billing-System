import Icon from "../../../../../../components/Icon/Icon";
import { TableInputField, TableInputFieldFormat } from "@/app/components/InputField";
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
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
        "border-t border-light-grey/20 transition-colors cursor-pointer select-text",
        row.isExisted
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
            disabled={row.isExisted}
            className="h-4 w-4 accent-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
            onClick={(e) => e.stopPropagation()}
            onChange={(event) => onSelectionChange(event.target.checked)}
          />
        </div>
      </td>

      {/* Nama Penghuni */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputField
              value={draft.nama}
              placeholder="Masukkan Nama Penghuni"
              align="start"
              onChange={(value) => onDraftChange("nama", value)}
            />
          </div>
        ) : (
          <span className="block truncate font-semibold text-dark-grey" title={row.nama}>
            {row.nama || "-"}
          </span>
        )}
        {row.isExisted && !isEditing ? (
          <p className="mt-1 text-[10px] font-semibold text-[#B54708]" title="Rekod bayaran ini telah wujud dalam sistem.">
            Rekod bayaran ini telah wujud dalam sistem.
          </p>
        ) : null}
      </td>

      {/* No. Kad Pengenalan */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputFieldFormat
              value={draft.noGajiNoKp}
              placeholder="Masukkan No. Kad Pengenalan"
              align="start"
              format="######-##-####"
              onChange={(value) => onDraftChange("noGajiNoKp", value)}
            />
          </div>
        ) : (
          <span
            className="block truncate font-semibold text-dark-grey"
            title={row.noGajiNoKp || "-"}
          >
            {row.noGajiNoKp && row.noGajiNoKp.length === 12
              ? row.noGajiNoKp.replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3")
              : row.noGajiNoKp || "-"}
          </span>
        )}
      </td>

      {/* Nama Jabatan */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputField
              value={draft.jabatanName}
              placeholder="Masukkan Nama Jabatan"
              align="start"
              onChange={(value) => onDraftChange("jabatanName", value)}
            />
          </div>
        ) : (
          <span
            className="block truncate font-semibold text-dark-grey"
            title={row.jabatanName || "-"}
          >
            {row.jabatanName || "-"}
          </span>
        )}
      </td>

      {/* No. Rujukan */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputField
              value={draft.noRujukan}
              placeholder="Masukkan No. Rujukan"
              align="start"
              onChange={(value) => onDraftChange("noRujukan", value)}
            />
          </div>
        ) : (
          <span
            className="block truncate font-semibold text-dark-grey"
            title={row.noRujukan || "-"}
          >
            {row.noRujukan || "-"}
          </span>
        )}
      </td>

      {/* Catatan */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputField
              value={draft.catatan}
              placeholder="Tambah catatan..."
              align="start"
              onChange={(value) => onDraftChange("catatan", value)}
            />
          </div>
        ) : (
          <span
            className="block truncate font-semibold text-dark-grey"
            title={row.catatan || "-"}
          >
            {row.catatan || "-"}
          </span>
        )}
      </td>

      {/* Amaun Bayar (RM) */}
      <td className={`overflow-hidden text-sm font-semibold text-dark-grey w-min whitespace-nowrap ${isEditing ? "px-3 py-4" : "px-3 py-2"}`}>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TableInputField
              value={draft.amaunRm}
              placeholder="0.00"
              align="end"
              inputMode="decimal"
              onChange={(value) => onDraftChange("amaunRm", value)}
            />
          </div>
        ) : (
          <span className="block text-right font-semibold text-dark-grey">
            {formatBayaranAmount(row.amaunRm)}
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
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <ActionButton
                icon="edit"
                label="Edit bayaran"
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

function formatBayaranAmount(value: string) {
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
