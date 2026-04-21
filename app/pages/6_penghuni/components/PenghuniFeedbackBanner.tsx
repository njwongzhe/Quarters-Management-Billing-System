import Icon from "@/app/components/Icon";

import type { NoticeTone, PenghuniNotice } from "./penghuniHelpers";

type PenghuniFeedbackBannerProps = {
  notice: PenghuniNotice | null;
  onDismiss: () => void;
};

const toneStyles: Record<
  NoticeTone,
  { containerClass: string; iconClass: string; icon: string }
> = {
  success: {
    containerClass: "border-green/25 bg-green/10",
    iconClass: "text-green",
    icon: "check_circle",
  },
  error: {
    containerClass: "border-red/20 bg-red/10",
    iconClass: "text-red",
    icon: "error",
  },
  info: {
    containerClass: "border-darkblue/15 bg-lightBlue/10",
    iconClass: "text-darkblue",
    icon: "info",
  },
};

export default function PenghuniFeedbackBanner({
  notice,
  onDismiss,
}: PenghuniFeedbackBannerProps) {
  if (!notice) {
    return null;
  }

  const tone = toneStyles[notice.tone];

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${tone.containerClass}`}
      role={notice.tone === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        <Icon icon={tone.icon} size={20} className={tone.iconClass} />
        <p className="text-sm font-medium text-darkGrey">{notice.message}</p>
      </div>

      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-1 text-grey transition-colors hover:bg-white/60 hover:text-darkGrey"
        aria-label="Tutup mesej"
        onClick={onDismiss}
      >
        <Icon icon="close" size={18} />
      </button>
    </div>
  );
}
