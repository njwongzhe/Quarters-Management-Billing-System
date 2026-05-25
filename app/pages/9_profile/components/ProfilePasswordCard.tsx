import Icon from "@/app/components/Icon/Icon";
import { InputFieldPassword } from "@/app/components/InputField";

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
  const hasPasswordMismatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword !== passwordForm.confirmPassword;

  return (
    <section className="mb-4 rounded-[5px] border border-[#E9EDF5] bg-white p-5.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-extrabold">
            <Icon icon="key" size={15} />
            TUKAR KATA LALUAN
          </div>
          <p className="text-[10px] leading-5 text-[#64748B]">
            Pastikan kata laluan anda kuat dan unik untuk melindungi akaun anda.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-dark-blue px-4 text-[11px] font-bold text-white transition hover:-translate-y-0.5 hover:opacity-90"
          onClick={onToggle}
        >
          <Icon icon={isChangingPassword ? "close" : "key"} size={14} />
          {isChangingPassword ? "Batal" : "Tukar"}
        </button>
      </div>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isChangingPassword
            ? "mt-5 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isChangingPassword}
      >
        <form className="grid min-h-0 gap-3" onSubmit={onSubmit}>
          {/* Current Password */}
          <InputFieldPassword
            label="KATA LALUAN SEMASA"
            value={passwordForm.currentPassword}
            state="active"
            placeholder="Masukkan kata laluan semasa."
            onChange={(value) =>
              onPasswordFormChange({ ...passwordForm, currentPassword: value })
            }
            required
            labelFontSize={8}
            inputFontSize={12}
            inputMinHeight={40}
            className="tracking-normal"
          />

          {/* New Password */}
          <InputFieldPassword
            label="KATA LALUAN BAHARU"
            value={passwordForm.newPassword}
            state="active"
            placeholder="Masukkan kata laluan baharu."
            onChange={(value) =>
              onPasswordFormChange({ ...passwordForm, newPassword: value })
            }
            required
            labelFontSize={8}
            inputFontSize={12}
            inputMinHeight={40}
            className="tracking-normal"
          />

          {/* Confirm New Password */}
          <InputFieldPassword
            label="SAHKAN KATA LALUAN BAHARU"
            value={passwordForm.confirmPassword}
            state="active"
            placeholder="Masukkan semula kata laluan baharu."
            onChange={(value) =>
              onPasswordFormChange({ ...passwordForm, confirmPassword: value })
            }
            required
            error={hasPasswordMismatch}
            errorMessage={
              hasPasswordMismatch ? "Kata laluan baharu tidak sepadan." : ""
            }
            labelFontSize={8}
            inputFontSize={12}
            inputMinHeight={40}
            className="tracking-normal"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] bg-dark-blue px-5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon icon="save" size={14} />
              {isSavingPassword ? "Menyimpan..." : "Simpan Kata Laluan"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
