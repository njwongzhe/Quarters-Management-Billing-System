import Icon from "../../../../../../components/Icon/Icon";
import type { ExtractedTunggakanRecord } from "../../../../components/extract-review-shared";

type TunggakanReviewRowProps = {
  row: ExtractedTunggakanRecord;
  draft: ExtractedTunggakanRecord;
  isEditing: boolean;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  onDraftAmountChange: (jumlahTunggakan: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export default function TunggakanReviewRow({
  row,
  draft,
  isEditing,
  isSelected,
  onSelectionChange,
  onDraftAmountChange,
  onSave,
  onDelete,
  onEdit,
}: TunggakanReviewRowProps) {
  return (
    <tr>
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={row.importStatus === "IGNORED"}
          className="h-4 w-4 accent-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
          onChange={(event) => onSelectionChange(event.target.checked)}
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-[#172033]">{row.nama}</p>
          {row.importStatus === "IGNORED" ? (
            <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#B54708]">
              Diabaikan
            </span>
          ) : null}
        </div>
        <p className="text-[10px] font-semibold text-[#667085]">
          {row.noKadPengenalan}
        </p>
        {row.importMessage ? (
          <p className="mt-1 text-[10px] font-semibold text-[#B54708]">
            {row.importMessage}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-4 text-right">
        {isEditing ? (
          <input
            className="h-10 w-24 rounded-lg border border-[#E6EAF2] px-3 text-right font-extrabold"
            value={draft.jumlahTunggakan}
            onChange={(event) => onDraftAmountChange(event.target.value)}
          />
        ) : (
          <span className="font-extrabold text-[#172033]">
            {Number(row.jumlahTunggakan || 0).toLocaleString("ms-MY", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          {row.importStatus === "IGNORED" ? (
            <Icon icon="block" size={16} weight={700} className="text-[#B54708]" />
          ) : isEditing ? (
            <>
              <button
                type="button"
                aria-label="Simpan perubahan tunggakan"
                onClick={onSave}
              >
                <Icon icon="save" size={16} weight={700} className="text-green" />
              </button>
              <button
                type="button"
                aria-label="Padam tunggakan"
                onClick={onDelete}
              >
                <Icon icon="delete" size={16} weight={700} className="text-red" />
              </button>
            </>
          ) : (
            <button type="button" aria-label="Edit tunggakan" onClick={onEdit}>
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
