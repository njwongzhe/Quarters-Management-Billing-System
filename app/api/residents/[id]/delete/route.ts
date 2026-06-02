import { NextResponse } from "next/server";

import {
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const { id } = await params;

    // Check if resident exists
    const resident = await prisma.resident.findUnique({
      where: { id },
    });

    if (!resident) {
      return createResidentErrorResponse(
        "Penghuni tidak ditemui.",
        404,
        "RESIDENT_NOT_FOUND",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.resident.delete({
        where: { id },
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Penghuni",
        actionType: "DELETE",
        target: formatAuditTarget([resident.fullName, `No. KP ${resident.icNumber}`]),
        entityType: "RESIDENT",
        entityId: resident.id,
        summary: "Memadam rekod penghuni daripada sistem.",
        details: [
          resident.phone ? `No. telefon terakhir: ${resident.phone}.` : null,
          resident.email ? `Emel terakhir: ${resident.email}.` : null,
          resident.status ? `Status terakhir: ${resident.status}.` : null,
        ],
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Rekod penghuni berjaya dipadamkan.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting resident:", error);

    const prismaErrorCode = getPrismaErrorCode(error);

    if (prismaErrorCode === "P2025") {
      return createResidentErrorResponse(
        "Penghuni tidak ditemui.",
        404,
        "RESIDENT_NOT_FOUND",
      );
    }

    if (prismaErrorCode === "P2003" || prismaErrorCode === "P2014") {
      return createResidentErrorResponse(
        "Penghuni ini tidak boleh dipadam kerana masih dirujuk oleh data lain.",
        409,
        "DELETE_CONFLICT",
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal memadamkan rekod penghuni.", errorCode: "DELETE_FAILED" },
      { status: 500 },
    );
  }
}
