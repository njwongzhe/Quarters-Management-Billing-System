import Icon from "@/app/components/Icon";

import type { Feedback } from "./profileTypes";

export default function ProfileFeedback({
  feedback,
  onClose,
}: {
  feedback: Feedback;
  onClose: () => void;
}) {
  return (
    <div
      className={[
        "fixed bottom-6 left-1/2 z-50 flex min-h-12 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 items-center justify-between gap-4 rounded-[5px] border px-4 py-3 text-xs font-extrabold shadow-[0_14px_40px_rgba(15,23,42,0.18)]",
        feedback.type === "success"
          ? "border-[#BFE3CE] bg-[#F0FFF6] text-[#126534]"
          : "border-[#F4C6C6] bg-[#FFF5F5] text-[#A51F1F]",
      ].join(" ")}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/5"
        onClick={onClose}
        aria-label="Tutup mesej"
      >
        <Icon icon="close" size={16} />
      </button>
    </div>
  );
}
