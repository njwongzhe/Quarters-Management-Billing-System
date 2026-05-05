import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function mapProfile(
  profile: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    department: string | null;
    gender: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  token: string,
) {
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
      profile: mapProfile(currentAdmin.profile, currentAdmin.token),
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
        profile: mapProfile(profile, currentAdmin.token),
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
