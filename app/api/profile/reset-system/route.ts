import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resetTables = [
  "UploadedDocument",
  "Transaction",
  "AdditionalCharge",
  "Rebate",
  "MonthlyCharge",
  "Payment",
  "ArrearsSummary",
  "UnitOccupancy",
  "Unit",
  "QuarterCategory",
  "Resident",
] as const;

export async function POST(request: Request) {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, message: "Sesi tamat tempoh. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const expectedKey = process.env.SYSTEM_RESET_CRITICAL_KEY;

    if (!expectedKey) {
      return NextResponse.json(
        {
          success: false,
          message: "SYSTEM_RESET_CRITICAL_KEY belum ditetapkan dalam .env.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const criticalKey =
      typeof body?.criticalKey === "string" ? body.criticalKey.trim() : "";

    if (!criticalKey || criticalKey !== expectedKey) {
      return NextResponse.json(
        { success: false, message: "Kunci kritikal tidak tepat." },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "AuditLog"
          ("userId", "userName", "moduleName", "pageName", "actionType", "description")
        VALUES
          (
            ${currentAdmin.profile.id}::uuid,
            ${currentAdmin.profile.fullName},
            ${"Profil"},
            ${"Sistem Set Semula"},
            ${"DELETE"}::"AuditActionType",
            ${"Admin menjalankan set semula sistem."}
          )
      `;

      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE ${resetTables
          .map((table) => `"${table}"`)
          .join(", ")} RESTART IDENTITY CASCADE`,
      );
    });

    return NextResponse.json({
      success: true,
      message: "Sistem berjaya ditetapkan semula.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal menetapkan semula sistem.",
      },
      { status: 500 },
    );
  }
}
