import Icon from "../../../../../../components/Icon";
import type { VerifyingMode } from "./types";

type ReviewActionsProps = {
  verifyingMode: VerifyingMode | null;
  verificationMessage: string;
  onVerify: (mode: VerifyingMode) => void;
};

export default function ReviewActions({
  verifyingMode,
  verificationMessage,
  onVerify,
}: ReviewActionsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex max-w-[calc(100vw-3rem)] flex-col items-end gap-2 sm:bottom-8 sm:right-8">
      {verificationMessage ? (
        <p className="max-w-sm rounded-xl border border-red/20 bg-white px-4 py-2 text-right text-xs font-bold text-red shadow-[0_12px_30px_rgba(13,47,86,0.12)]">
          {verificationMessage}
        </p>
      ) : null}
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
