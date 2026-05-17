import Icon from "../../../components/Icon/Icon";
import type { ProcessingDraftSummary } from "./extract-review-shared";
import { formatDraftDateTime } from "./extract-review-shared";
import type { Category } from "./types";

type ProcessingQueueTableProps = {
  activeCategory: Category;
  rows: ProcessingDraftSummary[];
  isLoading: boolean;
  onContinueDraft: (draft: ProcessingDraftSummary) => void;
  onDeleteDraft: (draftId: string) => void;
};

function getDraftIcon(draft: ProcessingDraftSummary) {
  return draft.fileName.toLowerCase().endsWith(".pdf")
    ? "picture_as_pdf"
    : "table";
}

function getDraftTone(draft: ProcessingDraftSummary) {
  return draft.fileName.toLowerCase().endsWith(".pdf") ? "red" : "green";
}

export default function ProcessingQueueTable({
  activeCategory,
  rows,
  isLoading,
  onContinueDraft,
  onDeleteDraft,
}: ProcessingQueueTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-[#07162F]">
          Barisan Pemprosesan
        </h2>
        <span className="rounded-full bg-[#DDE8FF] px-3 py-1 text-[11px] font-extrabold text-[#2D4A9A]">
          {rows.length} Fail {activeCategory} Sedang Menunggu
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#DCE2F1] bg-white shadow-sm">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="bg-light-blue text-[10px] font-extrabold uppercase tracking-wide text-[#4B5567]">
            <tr>
              <th className="w-[38%] px-6 py-4">Nama Dokumen</th>
              <th className="w-[20%] px-5 py-4">Pemuat Naik</th>
              <th className="w-[28%] px-5 py-4">Tarikh & Masa</th>
              <th className="w-[14%] px-5 py-4 text-center">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F7] text-xs">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                >
                  Memuatkan barisan pemprosesan...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                >
                  Tiada fail {activeCategory.toLowerCase()} sedang menunggu.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="h-14.5">
                  <td className="px-6 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded",
                          getDraftTone(row) === "green"
                            ? "bg-[#EAF8EF] text-green"
                            : "bg-[#FFF0F0] text-red",
                        ].join(" ")}
                      >
                        <Icon
                          icon={getDraftIcon(row)}
                          size={16}
                          filled
                          weight={600}
                        />
                      </span>
                      <span className="truncate font-extrabold text-[#172033]">
                        {row.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-[#3B465A]">
                    {row.uploadedBy}
                  </td>
                  <td className="px-5 py-4 font-medium text-[#3B465A]">
                    {formatDraftDateTime(row.uploadedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-5">
                      <button
                        type="button"
                        className="text-dark-blue transition hover:text-[#2D367D]"
                        title="Lihat"
                        onClick={() => onContinueDraft(row)}
                      >
                        <Icon icon="visibility" size={18} weight={600} />
                      </button>
                      <button
                        type="button"
                        className="text-red transition hover:text-[#8F1111]"
                        title="Padam"
                        onClick={() => onDeleteDraft(row.id)}
                      >
                        <Icon icon="delete" size={18} weight={600} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
