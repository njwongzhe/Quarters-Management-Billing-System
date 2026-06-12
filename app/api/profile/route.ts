import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { prisma } from "@/lib/prisma";
import { mapAdminProfile } from "@/lib/profile/profile-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return NextResponse.json(
      { success: false, message: "Sesi tamat tempoh. Sila log masuk semula." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      profile: mapAdminProfile(currentAdmin.profile, currentAdmin.token),
    },
  });
}

export async function PUT(request: Request) {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, message: "Sesi tamat tempoh. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const fullName = normalizeText(body?.fullName);
    const phoneNumber = normalizeText(body?.phoneNumber);
    const department = normalizeText(body?.department);
    const gender = normalizeGender(body?.gender);

    if (!fullName) {
      return NextResponse.json(
        { success: false, message: "Nama penuh diperlukan." },
        { status: 400 },
      );
    }

    const profile = await prisma.adminProfile.update({
      where: {
        id: currentAdmin.profile.id,
      },
      data: {
        fullName,
        phoneNumber: phoneNumber || null,
        department: department || null,
        gender,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profil berjaya dikemaskini.",
      data: {
        profile: mapAdminProfile(profile, currentAdmin.token),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mengemaskini profil.",
      },
      { status: 500 },
    );
  }
}

function normalizeGender(value: unknown) {
  const gender = normalizeText(value).toUpperCase();
  return gender === "LELAKI" || gender === "PEREMPUAN" ? gender : null;
}
