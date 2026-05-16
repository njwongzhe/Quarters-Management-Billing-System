import type { ParsingMode } from "./types";

const parsingModes: Array<{
  label: string;
  value: ParsingMode;
}> = [
  { label: "Mod Ketat", value: "strict" },
  { label: "Mod Bantuan AI", value: "assisted" },
];

type ParsingModeTabsProps = {
  value: ParsingMode;
  disabled?: boolean;
  onChange: (mode: ParsingMode) => void;
};

export default function ParsingModeTabs({
  value,
  disabled = false,
  onChange,
}: ParsingModeTabsProps) {
  return (
    <div className="grid h-10 w-full max-w-80 grid-cols-2 rounded-lg bg-light-blue p-1 shadow-[inset_0_0_0_1px_rgba(219,226,242,0.45)]">
      {parsingModes.map((mode) => {
        const isActive = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(mode.value)}
            className={[
              "rounded-md px-3 text-xs font-extrabold transition-colors",
              isActive
                ? "bg-white text-dark-blue shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                : "text-[#43506B] hover:bg-white/60 hover:text-dark-blue",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
