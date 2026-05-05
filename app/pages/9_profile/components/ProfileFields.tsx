import Icon from "@/app/components/Icon";

export function ProfileField({
  icon,
  label,
  value,
  isEditing,
  onChange,
  required = false,
}: {
  icon: string;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.9px] text-[#95A3B8]">
        {label}
      </span>
      {isEditing ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-[3px] border border-[#E6EAF2] px-3 text-xs font-bold text-[#0B1C30] outline-none focus:border-dark-blue"
          required={required}
        />
      ) : (
        <span className="flex min-h-5 items-center gap-2 text-xs text-[#0B1C30]">
          <Icon icon={icon} size={14} className="text-[#8AA0BD]" />
          {value || "-"}
        </span>
      )}
    </label>
  );
}

export function ReadOnlyProfileField({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[8px] font-extrabold uppercase tracking-[0.9px] text-[#95A3B8]">
        {label}
      </div>
      <div className="flex min-h-5 items-center gap-2 text-xs text-[#0B1C30]">
        <Icon icon={icon} size={14} className="text-[#8AA0BD]" />
        {value}
      </div>
    </div>
  );
}

export function ProfileSegmentedField({
  icon,
  label,
  value,
  isEditing,
  options,
  onChange,
}: {
  icon: string;
  label: string;
  value: string;
  isEditing: boolean;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "-";

  return (
    <label className="block">
      <span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-[0.9px] text-[#95A3B8]">
        {label}
      </span>
      {isEditing ? (
        <div className="grid h-10 grid-cols-3 gap-1 rounded-[3px] bg-[#F7F9FF] p-1">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={[
                  "inline-flex items-center justify-center gap-1.5 rounded-[2px] px-2 text-[11px] font-extrabold transition",
                  active
                    ? "border border-dark-blue bg-dark-blue text-white shadow-[0_3px_8px_rgba(21,30,102,0.18)]"
                    : "border border-[#E1E6F2] bg-white/45 text-[#667085] hover:bg-white hover:text-dark-blue",
                ].join(" ")}
                onClick={() => onChange(option.value)}
              >
                {option.value ? (
                  <Icon
                    icon={option.value === "PEREMPUAN" ? "female" : "male"}
                    size={14}
                  />
                ) : null}
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <span className="flex min-h-5 items-center gap-2 text-xs text-[#0B1C30]">
          <Icon icon={icon} size={14} className="text-[#8AA0BD]" />
          {selectedLabel}
        </span>
      )}
    </label>
  );
}

export function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[8px] font-extrabold uppercase tracking-[0.9px] text-[#95A3B8]">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[3px] border border-[#E6EAF2] px-3 text-xs font-bold text-[#0B1C30] outline-none focus:border-dark-blue"
        required
      />
    </label>
  );
}
