"use client";

import { useEffect, useState } from "react";

import ProfileDivider from "./components/ProfileDivider";
import ProfileFeedback from "./components/ProfileFeedback";
import ProfileHeaderCard from "./components/ProfileHeaderCard";
import ProfileInfoCard from "./components/ProfileInfoCard";
import ProfilePasswordCard from "./components/ProfilePasswordCard";
import ProfileResetCard from "./components/ProfileResetCard";
import type {
  AdminProfile,
  Feedback,
  PasswordForm,
  ProfileForm,
} from "./components/profileTypes";

const initialProfileForm: ProfileForm = {
  fullName: "",
  phoneNumber: "",
  department: "",
  gender: "",
};

const initialPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [criticalKey, setCriticalKey] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingReset, setIsSavingReset] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const adminDisplayId = profile?.id ? `ID: ${profile.id}` : "ID: -";

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal mendapatkan profil.");
        }

        if (!isMounted) {
          return;
        }

        const nextProfile = result.data.profile as AdminProfile;
        setProfile(nextProfile);
        setProfileForm(buildProfileForm(nextProfile));
      } catch (error) {
        if (isMounted) {
          showFeedback(
            "error",
            error instanceof Error ? error.message : "Gagal mendapatkan profil.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const feedbackTimer = window.setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => {
      window.clearTimeout(feedbackTimer);
    };
  }, [feedback]);

  function showFeedback(type: Feedback["type"], message: string) {
    setFeedback({ type, message });
  }

  function resetProfileForm() {
    if (profile) {
      setProfileForm(buildProfileForm(profile));
    }
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

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D9E1F3] border-t-dark-blue" />
      </div>
    );
  }

  return (
    <main className="w-full text-[#0B1C30]">
      {feedback ? (
        <ProfileFeedback feedback={feedback} onClose={() => setFeedback(null)} />
      ) : null}

      <ProfileHeaderCard
        fullName={profile?.fullName ?? "-"}
        gender={profile?.gender ?? ""}
        adminDisplayId={adminDisplayId}
        isEditingProfile={isEditingProfile}
        onToggleEdit={() => {
          resetProfileForm();
          setIsEditingProfile((current) => !current);
        }}
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
        onToggle={() => setIsChangingPassword((current) => !current)}
        onSubmit={handlePasswordSubmit}
        onPasswordFormChange={setPasswordForm}
      />

      <ProfileDivider />

      <ProfileResetCard
        criticalKey={criticalKey}
        isResetting={isResetting}
        isSavingReset={isSavingReset}
        onToggle={() => setIsResetting((current) => !current)}
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
