import Icon from "@/app/components/Icon";

export default function ProfileResetCard({
  criticalKey,
  isResetting,
  isSavingReset,
  onToggle,
  onSubmit,
  onCriticalKeyChange,
}: {
  criticalKey: string;
  isResetting: boolean;
  isSavingReset: boolean;
  onToggle: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCriticalKeyChange: (value: string) => void;
}) {
  return (
    <section className="rounded-[5px] border border-[#050505] bg-[#050505] p-5.5 text-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-extrabold">
            <Icon icon="restart_alt" size={15} />
            Sistem Set Semula
          </div>
          <p className="text-[10px] leading-5 text-[#C7C7C7]">
            Tindakan ini akan memadam data operasi sistem dan mengekalkan akaun admin.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-white px-4 text-[11px] font-extrabold text-[#111827] transition hover:-translate-y-0.5 hover:opacity-90"
          onClick={onToggle}
        >
          <Icon icon={isResetting ? "close" : "restart_alt"} size={14} />
          {isResetting ? "Batal" : "Set Semula"}
        </button>
      </div>

      {isResetting ? (
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="text-[8px] font-extrabold uppercase tracking-[0.9px] text-[#C7C7C7]">
              Kunci Kritikal
            </span>
            <input
              type="password"
              value={criticalKey}
              onChange={(event) => onCriticalKeyChange(event.target.value)}
              className="h-10 rounded-[3px] border border-white/15 bg-white/10 px-3 text-xs font-bold text-white outline-none placeholder:text-white/35 focus:border-white"
              placeholder="Masukkan kunci kritikal untuk sahkan"
              required
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingReset}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] bg-white px-5 text-[11px] font-extrabold text-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon icon="restart_alt" size={14} />
              {isSavingReset ? "Memproses..." : "Sahkan Set Semula"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
