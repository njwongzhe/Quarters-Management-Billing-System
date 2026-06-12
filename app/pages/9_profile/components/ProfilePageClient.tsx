"use client";

import { useState } from "react";

import GlobalFixedMessage from "@/app/components/Message/GlobalFixedMessage";
import ProfileDivider from "./ProfileDivider";
import ProfileHeaderCard from "./ProfileHeaderCard";
import ProfileInfoCard from "./ProfileInfoCard";
import ProfilePasswordCard from "./ProfilePasswordCard";
import ProfileResetCard from "./ProfileResetCard";
import type {
  AdminProfile,
  Feedback,
  PasswordForm,
  ProfileForm,
} from "./profileTypes";

const initialPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ProfilePageClient({
  initialProfile,
}: {
  initialProfile: AdminProfile;
}) {
  const [profile, setProfile] = useState<AdminProfile | null>(initialProfile);
  const [profileForm, setProfileForm] = useState(() =>
    buildProfileForm(initialProfile),
  );
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [criticalKey, setCriticalKey] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingReset, setIsSavingReset] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const adminDisplayId = profile?.id ? `ID: ${profile.id}` : "ID: -";

  function showFeedback(type: Feedback["type"], message: string) {
    setFeedback({ type, message });
  }

  function resetProfileForm() {
    if (profile) {
      setProfileForm(buildProfileForm(profile));
    }
  }

  // When editing profile, hide password change and reset sections. 
  function handleToggleProfileEdit() {
    setIsEditingProfile((current) => {
      const next = !current;

      if (next) {
        resetProfileForm();
        setIsChangingPassword(false);
        setIsResetting(false);
      }

      return next;
    });
  }

  // When changing password, hide profile edit and reset sections.
  function handleTogglePasswordSection() {
    setIsChangingPassword((current) => {
      const next = !current;

      if (next) {
        setIsEditingProfile(false);
        setIsResetting(false);
      }

      return next;
    });
  }

  // When resetting system, hide profile edit and password change sections.
  function handleToggleResetSection() {
    setIsResetting((current) => {
      const next = !current;

      if (next) {
        setIsEditingProfile(false);
        setIsChangingPassword(false);
      }

      return next;
    });
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengemaskini profil.");
      }

      const nextProfile = result.data.profile as AdminProfile;
      setProfile(nextProfile);
      setProfileForm(buildProfileForm(nextProfile));
      setIsEditingProfile(false);
      showFeedback("success", result.message || "Profil berjaya dikemaskini.");
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "Gagal mengemaskini profil.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback("error", "Pengesahan kata laluan tidak sepadan.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menukar kata laluan.");
      }

      setPasswordForm(initialPasswordForm);
      setIsChangingPassword(false);
      showFeedback("success", result.message || "Kata laluan berjaya ditukar.");
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "Gagal menukar kata laluan.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingReset(true);

    try {
      const response = await fetch("/api/profile/reset-system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          criticalKey,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menetapkan semula sistem.");
      }

      setCriticalKey("");
      setIsResetting(false);
      showFeedback("success", result.message || "Sistem berjaya ditetapkan semula.");
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "Gagal menetapkan semula sistem.",
      );
    } finally {
      setIsSavingReset(false);
    }
  }

  return (
    <main className="w-full text-content">
      <GlobalFixedMessage
        notice={feedback ? { tone: feedback.type, message: feedback.message } : null}
        onDismiss={() => setFeedback(null)}
      />

      <ProfileHeaderCard
        fullName={profile?.fullName ?? "-"}
        gender={profile?.gender ?? ""}
        adminDisplayId={adminDisplayId}
        isEditingProfile={isEditingProfile}
        onToggleEdit={handleToggleProfileEdit}
      />

      <ProfileInfoCard
        profile={profile}
        profileForm={profileForm}
        isEditingProfile={isEditingProfile}
        isSavingProfile={isSavingProfile}
        onSubmit={handleProfileSubmit}
        onProfileFormChange={setProfileForm}
      />

      <ProfilePasswordCard
        passwordForm={passwordForm}
        isChangingPassword={isChangingPassword}
        isSavingPassword={isSavingPassword}
        onToggle={handleTogglePasswordSection}
        onSubmit={handlePasswordSubmit}
        onPasswordFormChange={setPasswordForm}
      />

      <ProfileDivider />

      <ProfileResetCard
        criticalKey={criticalKey}
        isResetting={isResetting}
        isSavingReset={isSavingReset}
        onToggle={handleToggleResetSection}
        onSubmit={handleResetSubmit}
        onCriticalKeyChange={setCriticalKey}
      />
    </main>
  );
}

function buildProfileForm(profile: AdminProfile): ProfileForm {
  return {
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber ?? "",
    department: profile.department ?? "",
    gender: profile.gender ?? "",
  };
}
