import Icon from "@/app/components/Icon/Icon";
import { buildDiceBearAvatarUrl } from "@/lib/profile/avatar";

export default function ProfileHeaderCard({
  fullName,
  gender,
  adminDisplayId,
  isEditingProfile,
  onToggleEdit,
}: {
  fullName: string;
  gender: string;
  adminDisplayId: string;
  isEditingProfile: boolean;
  onToggleEdit: () => void;
}) {
  const displayAvatarUrl = buildDiceBearAvatarUrl(fullName, gender);

  return (
    <section className="mb-4 overflow-hidden rounded-[5px] border border-[#E9EDF5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="h-21.5 bg-[linear-gradient(90deg,#151E66,#303887)]" />
      <div className="relative flex min-h-20.25 items-center justify-between px-5.5 pl-32.25 max-sm:flex-col max-sm:items-start max-sm:gap-4 max-sm:px-4.5 max-sm:pb-5 max-sm:pt-17.5">
        <div className="absolute left-5.5 -top-8 h-23 w-23 rounded-lg bg-white p-1.25 shadow-[0_4px_10px_rgba(15,23,42,0.13)] max-sm:left-4.5">
          <div
            className="h-full rounded-[7px] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${displayAvatarUrl}")` }}
            aria-label={`Avatar ${fullName}`}
            role="img"
          />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold">{fullName}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-extrabold text-dark-blue">
            <Icon icon="admin_panel_settings" size={14} />
            <span>{adminDisplayId}</span>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-dark-blue px-4 text-[11px] font-extrabold text-white transition hover:-translate-y-0.5 hover:opacity-90"
          onClick={onToggleEdit}
        >
          <Icon icon={isEditingProfile ? "close" : "edit"} size={14} />
          {isEditingProfile ? "Batal" : "Kemaskini Profil"}
        </button>
      </div>
    </section>
  );
}
