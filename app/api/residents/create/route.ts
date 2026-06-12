import { NextRequest, NextResponse } from "next/server";
import type { ResidentStatus } from "@prisma/client";

import {
    formatAuditTarget,
    recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
    mapResidentRecord,
    residentRecordSelect,
} from "@/lib/residents/resident-list";
import { prisma } from "../../../../lib/prisma";

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

export async function POST(req: NextRequest) {
    try {
        const currentAdmin = await getCurrentAdmin();
        const body = await req.json();

        // Validate required fields
        const { fullName, icNumber, phone, email, position, department, serviceLevel, status, description } = body;

        if (!fullName || !icNumber) {
            return createResidentErrorResponse(
                "Nama penghuni dan No. KP adalah wajib.",
                400,
                "VALIDATION_ERROR",
            );
        }

        const normalizedIcNumber = String(icNumber).trim();
        // Ensure initial status is only AKTIF or TIDAK_LAYAK
        const desiredStatus = normalizeResidentStatus(status);
        const initialStatus: ResidentStatus = (desiredStatus === "AKTIF" || desiredStatus === "TIDAK_LAYAK") ? desiredStatus : "AKTIF";

        const newResident = await prisma.$transaction(async (tx) => {
            const resident = await tx.resident.create({
                data: {
                    fullName: String(fullName).trim(),
                    icNumber: normalizedIcNumber,
                    phone: phone || null,
                    email: email || null,
                    position: position || null,
                    department: department || null,
                    serviceLevel: serviceLevel || null,
                    status: initialStatus,
                    description: description || null,
                },
                select: residentRecordSelect,
            });

            await recordDataAuditLog(tx, {
                actor: currentAdmin,
                moduleName: "Pengurusan Penghuni",
                actionType: "CREATE",
                target: formatAuditTarget([resident.fullName, `No. KP ${resident.icNumber}`]),
                entityType: "RESIDENT",
                entityId: resident.id,
                summary: "Menambah rekod penghuni baharu ke dalam sistem.",
                details: [
                    `Status awal ditetapkan kepada ${resident.status}.`,
                    resident.phone ? `No. telefon: ${resident.phone}.` : null,
                    resident.email ? `Emel: ${resident.email}.` : null,
                    resident.department ? `Jabatan: ${resident.department}.` : null,
                    resident.position ? `Jawatan: ${resident.position}.` : null,
                ],
            });

            return resident;
        });

        return NextResponse.json(
            {
                success: true,
                message: "Rekod penghuni berjaya ditambah.",
                data: mapResidentRecord(newResident),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating resident:", error);

        if (getPrismaErrorCode(error) === "P2002") {
            return createResidentErrorResponse(
                "No. KP ini sudah wujud dalam sistem.",
                409,
                "RESIDENT_IC_EXISTS",
            );
        }

        return NextResponse.json(
            { success: false, message: "Gagal menambah rekod penghuni.", errorCode: "CREATE_FAILED" },
            { status: 500 },
        );
    }
}
