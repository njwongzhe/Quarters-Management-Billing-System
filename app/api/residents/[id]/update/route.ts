import { NextResponse } from "next/server";
import type { ResidentStatus } from "@prisma/client";

import { prisma } from "../../../../../lib/prisma";

// Error response helper
function createResidentErrorResponse(
  message: string,
  status: number,
  errorCode: string,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      errorCode,
    },
    { status },
  );
}

// Extract error code from Prisma error
function getPrismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

// Normalize resident status
function normalizeResidentStatus(status: unknown): ResidentStatus {
  if (typeof status !== "string") {
    return "AKTIF";
  }
  const normalized = status.trim().toUpperCase().replace(/\s+/g, "_");
  switch (normalized) {
    case "AKTIF":
    case "TIDAK_LAYAK":
    case "PENCEN_MENDATANG":
    case "DATA_TIDAK_LENGKAP":
    case "KELUAR":
      return normalized as ResidentStatus;
    default:
      return "AKTIF" as ResidentStatus;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      fullName,
      icNumber,
      phone,
      email,
      position,
      department,
      serviceLevel,
      status,
      description,
    } = body;

    // Validate required fields
    if (!fullName || !icNumber) {
      return createResidentErrorResponse(
        "Nama dan No. KP diperlukan.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const resident = await prisma.resident.findUnique({
      where: { id },
      select: { id: true, icNumber: true },
    });

    if (!resident) {
      return createResidentErrorResponse(
        "Penghuni tidak ditemui.",
        404,
        "RESIDENT_NOT_FOUND",
      );
    }

    const normalizedIcNumber = String(icNumber).trim();
    const existingResident = await prisma.resident.findUnique({
      where: { icNumber: normalizedIcNumber },
      select: { id: true },
    });

    if (existingResident && existingResident.id !== id) {
      return createResidentErrorResponse(
        "No. KP ini sudah wujud dalam sistem.",
        409,
        "RESIDENT_IC_EXISTS",
      );
    }

    const updatedResident = await prisma.resident.update({
      where: { id },
      data: {
        fullName: String(fullName).trim(),
        icNumber: normalizedIcNumber,
        phone: phone || null,
        email: email || null,
        position: position || null,
        department: department || null,
        serviceLevel: serviceLevel || null,
        status: normalizeResidentStatus(status),
        description: description || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Rekod penghuni berjaya dikemas kini.",
        data: updatedResident,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating resident:", error);

    const prismaErrorCode = getPrismaErrorCode(error);

    if (prismaErrorCode === "P2002") {
      return createResidentErrorResponse(
        "No. KP ini sudah wujud dalam sistem.",
        409,
        "RESIDENT_IC_EXISTS",
      );
    }

    if (prismaErrorCode === "P2025") {
      return createResidentErrorResponse(
        "Penghuni tidak ditemui.",
        404,
        "RESIDENT_NOT_FOUND",
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal mengemas kini rekod penghuni.", errorCode: "UPDATE_FAILED" },
      { status: 500 },
    );
  }
}
