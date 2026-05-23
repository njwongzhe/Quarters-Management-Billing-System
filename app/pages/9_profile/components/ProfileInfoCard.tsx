import Icon from "@/app/components/Icon/Icon";
import { InputField, InputFieldFormat } from "@/app/components/InputField";

import {
  ProfileSegmentedField,
} from "./ProfileFields";
import type { AdminProfile, ProfileForm } from "./profileTypes";

function formatPhoneForDisplay(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");

  if (!digits) {
    return "-";
  }

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
}

function ProfileValueRow({
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
      <div className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.9px] text-[#95A3B8]">
        {label}
      </div>
      <div className="flex min-h-5 items-center gap-2 text-xs text-[#0B1C30]">
        <Icon icon={icon} size={14} className="text-[#8AA0BD]" />
        {value || "-"}
      </div>
    </div>
  );
}

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
        MAKLUMAT PERHUBUNGAN
      </h2>

      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
          isEditingProfile ? "max-h-176" : "max-h-112"
        }`}
      >
        <div className="flex flex-col gap-4.5">
        {/* Name */}
        {isEditingProfile ? (
          <InputField
            label="NAMA PENUH"
            value={profileForm.fullName}
            state="active"
            onChange={(value) =>
              onProfileFormChange({ ...profileForm, fullName: value })
            }
            leadingIcon={<Icon icon="person" size={14} className="text-[#8AA0BD]" />}
            labelFontSize={8}
            inputFontSize={12}
            inputMinHeight={40}
            className="tracking-normal"
            required
          />
        ) : (
          <ProfileValueRow
            icon="person"
            label="NAMA PENUH"
            value={profileForm.fullName || "-"}
          />
        )}

        {/* Department & Unit */}
        {isEditingProfile ? (
          <InputField
            label="JABATAN / UNIT"
            value={profileForm.department}
            state="active"
            onChange={(value) =>
              onProfileFormChange({ ...profileForm, department: value })
            }
            leadingIcon={<Icon icon="apartment" size={14} className="text-[#8AA0BD]" />}
            labelFontSize={8}
            inputFontSize={12}
            inputMinHeight={40}
            className="tracking-normal"
          />
        ) : (
          <ProfileValueRow
            icon="apartment"
            label="JABATAN / UNIT"
            value={profileForm.department || "-"}
          />
        )}

        {/* Gender */}
        <ProfileSegmentedField
          icon="wc"
          label="JANTINA"
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
        <ProfileValueRow
          icon="email"
          label="ALAMAT EMEL"
          value={profile?.email ?? "-"}
        />

        {/* Phone Number */}
        {isEditingProfile ? (
          <InputFieldFormat
            label="NOMBOR TELEFON"
            format="###-#### ####"
            value={profileForm.phoneNumber}
            state="active"
            onChange={(value) =>
              onProfileFormChange({ ...profileForm, phoneNumber: value })
            }
            leadingIcon={<Icon icon="phone" size={14} className="text-[#8AA0BD]" />}
            labelFontSize={8}
            inputFontSize={12}
            inputMinHeight={40}
            className="tracking-normal"
          />
        ) : (
          <ProfileValueRow
            icon="phone"
            label="NOMBOR TELEFON"
            value={formatPhoneForDisplay(profileForm.phoneNumber)}
          />
        )}

        {/* Save Button */}
        {isEditingProfile ? (
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] bg-dark-blue px-5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon icon="save" size={14} />
              {isSavingProfile ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </div>
        ) : null}
        </div>
      </div>

    </form>
  );
}