import Icon from "../../../../../../components/Icon/Icon";

type ReviewHeaderProps = {
  fileName: string;
  onReviewLater: () => void;
};

export default function ReviewHeader({
  fileName,
  onReviewLater,
}: ReviewHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        className="fixed left-61 top-6 z-40 inline-flex min-h-10 items-center gap-2 rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-extrabold text-grey shadow-[0_12px_30px_rgba(13,47,86,0.12)] transition-colors hover:border-dark-blue hover:text-dark-blue"
        onClick={onReviewLater}
      >
        <Icon icon="arrow_back" size={18} />
        Semak Nanti
      </button>

      <div className="flex min-w-0 items-start gap-4">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#FFEAEA] text-red">
          <Icon icon="picture_as_pdf" size={22} filled weight={700} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-extrabold leading-tight text-[#07162F]">
            {fileName}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#667085]">
            Sila sahkan ketepatan data yang telah diekstrak secara automatik.
          </p>
        </div>
      </div>
    </div>
  );
}
