import Icon from "@/app/components/Icon/Icon";

import { PasswordInput } from "./ProfileFields";
import type { PasswordForm } from "./profileTypes";

export default function ProfilePasswordCard({
  passwordForm,
  isChangingPassword,
  isSavingPassword,
  onToggle,
  onSubmit,
  onPasswordFormChange,
}: {
  passwordForm: PasswordForm;
  isChangingPassword: boolean;
  isSavingPassword: boolean;
  onToggle: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPasswordFormChange: (form: PasswordForm) => void;
}) {
  return (
    <section className="mb-4 rounded-[5px] border border-[#E9EDF5] bg-white p-5.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-extrabold">
            <Icon icon="key" size={15} />
            Tukar Kata Laluan
          </div>
          <p className="text-[10px] leading-5 text-[#64748B]">
            Pastikan kata laluan anda kuat dan unik untuk melindungi akaun anda.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-dark-blue px-4 text-[11px] font-extrabold text-white transition hover:-translate-y-0.5 hover:opacity-90"
          onClick={onToggle}
        >
          <Icon icon={isChangingPassword ? "close" : "key"} size={14} />
          {isChangingPassword ? "Batal" : "Tukar"}
        </button>
      </div>

      {isChangingPassword ? (
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <PasswordInput
            label="Kata Laluan Semasa"
            value={passwordForm.currentPassword}
            onChange={(value) =>
              onPasswordFormChange({ ...passwordForm, currentPassword: value })
            }
          />
          <PasswordInput
            label="Kata Laluan Baharu"
            value={passwordForm.newPassword}
            onChange={(value) =>
              onPasswordFormChange({ ...passwordForm, newPassword: value })
            }
          />
          <PasswordInput
            label="Sahkan Kata Laluan Baharu"
            value={passwordForm.confirmPassword}
            onChange={(value) =>
              onPasswordFormChange({ ...passwordForm, confirmPassword: value })
            }
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] bg-dark-blue px-5 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon icon="save" size={14} />
              {isSavingPassword ? "Menyimpan..." : "Simpan Kata Laluan"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
