import Icon from "../../../../../../components/Icon/Icon";
import type { VerifyingMode } from "./types";

type ReviewActionsProps = {
  verifyingMode: VerifyingMode | null;
  onVerify: (mode: VerifyingMode) => void;
};

export default function ReviewActions({
  verifyingMode,
  onVerify,
}: ReviewActionsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex max-w-[calc(100vw-3rem)] flex-col items-end gap-2 sm:bottom-8 sm:right-8">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-extrabold text-white shadow-[0_18px_45px_rgba(13,47,86,0.28)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onVerify("selected")}
          disabled={verifyingMode === "selected"}
        >
          <Icon icon="settings_backup_restore" size={18} weight={700} />
          {verifyingMode === "selected" ? "Mengesahkan..." : "Sahkan Data"}
        </button>
      </div>
    </div>
  );
}
