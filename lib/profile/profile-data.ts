import type { AdminProfile } from "@prisma/client";

import { getCurrentAdmin } from "@/lib/auth/current-admin";

export function mapAdminProfile(profile: AdminProfile, token: string) {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    department: profile.department,
    gender: profile.gender,
    role: profile.role,
    isActive: profile.isActive,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    sessionLoginAt: getJwtIssuedAt(token),
  };
}

export async function getCurrentProfileData() {
  const currentAdmin = await getCurrentAdmin();

  return currentAdmin
    ? mapAdminProfile(currentAdmin.profile, currentAdmin.token)
    : null;
}

function getJwtIssuedAt(token: string) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(
      Buffer.from(normalizedPayload, "base64").toString("utf8"),
    ) as { iat?: unknown };

    return typeof decodedPayload.iat === "number"
      ? new Date(decodedPayload.iat * 1000).toISOString()
      : null;
  } catch {
    return null;
  }
}
