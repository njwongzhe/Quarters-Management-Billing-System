import Icon from "../../../../../../components/Icon/Icon";
import type { ExtractedPenghuniRecord } from "../../../../components/extract-review-shared";
import { getPenghuniRecordKey } from "./helpers";

type PenghuniReviewRowProps = {
  resident: ExtractedPenghuniRecord;
  isSelected: boolean;
  onSelectionChange: (key: string, checked: boolean) => void;
};

export default function PenghuniReviewRow({
  resident,
  isSelected,
  onSelectionChange,
}: PenghuniReviewRowProps) {
  const recordKey = getPenghuniRecordKey(resident);

  return (
    <tr>
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          className="h-4 w-4 accent-dark-blue"
          onChange={(event) => onSelectionChange(recordKey, event.target.checked)}
        />
      </td>
      <td className="px-4 py-4">
        <p className="font-extrabold text-[#172033]">{resident.nama}</p>
        <p className="text-[10px] font-semibold text-[#667085]">
          {resident.noKadPengenalan}
        </p>
      </td>
      <td className="whitespace-pre-line px-4 py-4">
        {[resident.kuarters, resident.unit, resident.alamatKuarters]
          .filter(Boolean)
          .join("\n")}
      </td>
      <td className="whitespace-pre-line px-4 py-4">
        {resident.perhubungan || "-"}
      </td>
      <td className="whitespace-pre-line px-4 py-4">
        {[resident.pekerjaan, resident.jabatan].filter(Boolean).join("\n")}
      </td>
      <td className="px-4 py-4 text-center">
        <Icon icon="visibility" size={17} weight={700} className="text-dark-blue" />
      </td>
    </tr>
  );
}
