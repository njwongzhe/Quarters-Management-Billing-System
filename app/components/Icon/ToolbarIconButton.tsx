import Icon from "@/app/components/Icon/Icon";

type ToolbarIconButtonProps = {
  icon: string;
  label: string;
  activeBadge?: number;
  disabled?: boolean;
  isActive?: boolean;
  isExpanded?: boolean;
  hasPopup?: "menu" | boolean;
  onClick?: () => void;
};

export default function ToolbarIconButton({
  icon,
  label,
  activeBadge,
  disabled = false,
  isActive = false,
  isExpanded,
  hasPopup,
  onClick,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border p-2 transition-colors ${
        isActive
          ? "border-dark-blue bg-dark-blue text-white"
          : "border-light-grey/20 bg-white text-grey hover:border-dark-blue hover:text-dark-blue"
      } disabled:cursor-not-allowed disabled:opacity-40`}
      aria-label={label}
      aria-expanded={isExpanded}
      aria-haspopup={hasPopup}
      aria-pressed={isActive}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      <Icon icon={icon} size={20} />
      {activeBadge ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[9px] font-extrabold leading-none text-white">
          {activeBadge}
        </span>
      ) : null}
    </button>
  );
}
