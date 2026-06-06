import { NextResponse } from "next/server";
import type { ResidentStatus } from "@prisma/client";

import {
  buildAuditChanges,
  formatAuditTarget,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
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
    const currentAdmin = await getCurrentAdmin();
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
      select: {
        id: true,
        fullName: true,
        icNumber: true,
        phone: true,
        email: true,
        position: true,
        department: true,
        serviceLevel: true,
        status: true,
        description: true,
      },
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

    // Server-side: enforce the same status transition rules used by the
    // resident detail editor. Age/status automation may set a resident to
    // PENCEN_MENDATANG, and saving profile fields should not force them to
    // change into another status.
    const originalStatus = resident.status as ResidentStatus | undefined;
    const requestedStatus = normalizeResidentStatus(status);

    const allowedTransition = (() => {
      if (!originalStatus) return true;
      if (originalStatus === "DATA_TIDAK_LENGKAP") return requestedStatus === originalStatus;
      if (originalStatus === "AKTIF") return ["AKTIF", "TIDAK_LAYAK"].includes(requestedStatus);
      if (originalStatus === "PENCEN_MENDATANG") return ["PENCEN_MENDATANG", "TIDAK_LAYAK"].includes(requestedStatus);
      if (originalStatus === "TIDAK_LAYAK") return ["TIDAK_LAYAK", "AKTIF"].includes(requestedStatus);
      return true;
    })();

    if (!allowedTransition) {
      return createResidentErrorResponse(
        "Perubahan status tidak dibenarkan untuk rekod ini.",
        400,
        "INVALID_STATUS_TRANSITION",
      );
    }

    const updateData = {
      fullName: String(fullName).trim(),
      icNumber: normalizedIcNumber,
      phone: phone || null,
      email: email || null,
      position: position || null,
      department: department || null,
      serviceLevel: serviceLevel || null,
      status: requestedStatus,
      description: description || null,
    };
    const changes = buildAuditChanges(resident, updateData, {
      fullName: "Nama penuh",
      icNumber: "No. KP",
      phone: "No. telefon",
      email: "Emel",
      position: "Jawatan",
      department: "Jabatan",
      serviceLevel: "Gred perkhidmatan",
      status: "Status penghuni",
      description: "Catatan",
    });

    const updatedResident = await prisma.$transaction(async (tx) => {
      const nextResident = await tx.resident.update({
        where: { id },
        data: updateData,
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Penghuni",
        actionType: "UPDATE",
        target: formatAuditTarget([nextResident.fullName, `No. KP ${nextResident.icNumber}`]),
        entityType: "RESIDENT",
        entityId: nextResident.id,
        summary: changes.length > 0
          ? "Mengemaskini maklumat penghuni."
          : "Permintaan kemas kini diterima tetapi tiada perubahan data dikesan.",
        changes,
      });

      return nextResident;
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
