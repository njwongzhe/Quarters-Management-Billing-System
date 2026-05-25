import Icon from "@/app/components/Icon/Icon";
import { InputFieldPassword } from "@/app/components/InputField";

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
            SISTEM SET SEMULA
          </div>
          <p className="text-[10px] leading-5 text-[#C7C7C7]">
            Tindakan ini akan memadam data operasi sistem dan mengekalkan akaun admin.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-white px-4 text-[11px] font-bold text-[#111827] transition hover:-translate-y-0.5 hover:opacity-90"
          onClick={onToggle}
        >
          <Icon icon={isResetting ? "close" : "restart_alt"} size={14} />
          {isResetting ? "Batal" : "Set Semula"}
        </button>
      </div>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isResetting
            ? "mt-5 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isResetting}
      >
        <form className="grid min-h-0 gap-3" onSubmit={onSubmit}>
          <InputFieldPassword
            label="KUNCI KRITIKAL"
            value={criticalKey}
            state="active"
            onChange={onCriticalKeyChange}
            placeholder="Masukkan kunci kritikal untuk sahkan."
            required
            labelFontSize={8}
            inputFontSize={12}
            inputMinHeight={40}
            className="tracking-normal"
            activeBackgroundClass="bg-white/10 text-white border-white/15 placeholder:text-white/35 focus:border-white"
            toggleButtonClassName="text-white/70 hover:text-white"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingReset}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] bg-white px-5 text-[11px] font-bold text-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon icon="restart_alt" size={14} />
              {isSavingReset ? "Memproses..." : "Sahkan Set Semula"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
