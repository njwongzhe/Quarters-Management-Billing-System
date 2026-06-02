import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createAuditLog } from "@/lib/audit/audit-logs";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
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
  "BillingCycle",
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
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE ${resetTables
          .map((table) => `"${table}"`)
          .join(", ")} RESTART IDENTITY CASCADE`,
      );

      const deletedAuditLogs = await tx.auditLog.deleteMany({});

      await createAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Profil",
        targetData: "Set Semula Sistem",
        actionType: "DELETE",
        description: [
          "Ringkasan: Admin menjalankan set semula sistem dan memadam semua data operasi.",
          "Sasaran Data: Semua data operasi sistem dan rekod jejak audit terdahulu.",
          `Butiran: Jadual operasi dikosongkan: ${resetTables.join(", ")}. Jumlah rekod jejak audit terdahulu dipadam: ${deletedAuditLogs.count}. Rekod ini dicipta selepas pembersihan jejak audit selesai sebagai bukti tindakan set semula sistem.`,
        ].join("\n"),
      });
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
