import Icon from "../../../../../../components/Icon";
import type { BayaranReviewRowModel } from "./types";

type BayaranReviewRowProps = {
  row: BayaranReviewRowModel;
  draft: BayaranReviewRowModel;
  isEditing: boolean;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  onDraftChange: (field: "amaunRm" | "catatan", value: string) => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

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
    <tr>
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(event) => onSelectionChange(event.target.checked)}
          className="h-4 w-4 accent-dark-blue"
        />
      </td>
      <td className="px-4 py-4">
        <p className="font-extrabold leading-5 text-[#172033]">{row.nama}</p>
        <p className="text-[10px] font-semibold text-[#667085]">
          {row.noGajiNoKp}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="whitespace-nowrap font-extrabold text-[#172033]">
          {row.ptjpkCode}
        </p>
        <p className="whitespace-nowrap text-[10px] font-medium text-[#667085]">
          Jabatan {row.jabatanCode}
        </p>
      </td>
      <td className="px-4 py-4 font-semibold leading-5 text-[#172033]">
        {row.ptjpkName || "-"}
      </td>
      <td className="px-4 py-4 font-semibold leading-5 text-[#172033]">
        {row.jabatanName || "-"}
      </td>
      <td className="px-4 py-4 wrap-break-word">{row.noRujukan || "-"}</td>
      <td className="px-4 py-4">
        {isEditing ? (
          <input
            className="h-10 w-full rounded-lg border border-[#E6EAF2] px-3 text-xs"
            placeholder="Tambah catatan..."
            value={draft.catatan}
            onChange={(event) => onDraftChange("catatan", event.target.value)}
          />
        ) : (
          row.catatan || "bayaran"
        )}
      </td>
      <td className="px-4 py-4 text-right">
        {isEditing ? (
          <input
            className="h-10 w-23 rounded-lg border border-[#E6EAF2] px-3 text-right font-extrabold"
            value={draft.amaunRm}
            onChange={(event) => onDraftChange("amaunRm", event.target.value)}
          />
        ) : (
          <span className="font-extrabold text-[#172033]">{row.amaunRm}</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          {isEditing ? (
            <>
              <button
                type="button"
                aria-label="Simpan perubahan bayaran"
                onClick={onSave}
              >
                <Icon icon="save" size={16} weight={700} className="text-green" />
              </button>
              <button type="button" aria-label="Padam bayaran" onClick={onDelete}>
                <Icon icon="delete" size={16} weight={700} className="text-red" />
              </button>
            </>
          ) : (
            <button type="button" aria-label="Edit bayaran" onClick={onEdit}>
              <Icon
                icon="edit"
                size={16}
                weight={700}
                className="text-dark-blue"
              />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
