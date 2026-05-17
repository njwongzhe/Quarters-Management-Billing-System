import Icon from "@/app/components/Icon/Icon";

import {
  ProfileField,
  ProfileSegmentedField,
  ReadOnlyProfileField,
} from "./ProfileFields";
import type { AdminProfile, ProfileForm } from "./profileTypes";

export default function ProfileInfoCard({
  profile,
  profileForm,
  isEditingProfile,
  isSavingProfile,
  onSubmit,
  onProfileFormChange,
}: {
  profile: AdminProfile | null;
  profileForm: ProfileForm;
  isEditingProfile: boolean;
  isSavingProfile: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onProfileFormChange: (form: ProfileForm) => void;
}) {
  return (
    <form
      className="mb-4 rounded-[5px] border border-[#E9EDF5] bg-white p-5.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      onSubmit={onSubmit}
    >
      <h2 className="mb-7 flex items-center gap-2 text-xs font-extrabold">
        <Icon icon="badge" size={15} />
        Maklumat Perhubungan
      </h2>

      <div className="flex flex-col gap-4.5">
        <ProfileField
          icon="person"
          label="Nama Penuh"
          value={profileForm.fullName}
          isEditing={isEditingProfile}
          onChange={(value) =>
            onProfileFormChange({ ...profileForm, fullName: value })
          }
          required
        />
        <ProfileField
          icon="apartment"
          label="Jabatan / Unit"
          value={profileForm.department}
          isEditing={isEditingProfile}
          onChange={(value) =>
            onProfileFormChange({ ...profileForm, department: value })
          }
        />
        <ProfileSegmentedField
          icon="wc"
          label="Jantina"
          value={profileForm.gender}
          isEditing={isEditingProfile}
          options={[
            { value: "", label: "-" },
            { value: "LELAKI", label: "Lelaki" },
            { value: "PEREMPUAN", label: "Perempuan" },
          ]}
          onChange={(value) =>
            onProfileFormChange({ ...profileForm, gender: value })
          }
        />
        <ReadOnlyProfileField
          icon="email"
          label="Alamat Emel"
          value={profile?.email ?? "-"}
        />
        <ProfileField
          icon="phone"
          label="Nombor Telefon"
          value={profileForm.phoneNumber}
          isEditing={isEditingProfile}
          onChange={(value) =>
            onProfileFormChange({ ...profileForm, phoneNumber: value })
          }
        />
      </div>

      {isEditingProfile ? (
        <div className="mt-7 flex justify-end">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] bg-dark-blue px-5 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon icon="save" size={14} />
            {isSavingProfile ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
