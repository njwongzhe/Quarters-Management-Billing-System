import { redirect } from "next/navigation";

import { ROUTES } from "@/app/constants/routes";
import { getCurrentProfileData } from "@/lib/profile/profile-data";

import ProfilePageClient from "./components/ProfilePageClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getCurrentProfileData();

  if (!profile) {
    redirect(ROUTES.auth);
  }

  return <ProfilePageClient initialProfile={profile} />;
}
