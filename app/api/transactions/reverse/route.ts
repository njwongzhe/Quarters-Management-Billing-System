import { NextRequest, NextResponse } from "next/server";
import { reverseTransaction } from "@/lib/transactions/transactions";
import {
  formatAuditTarget,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. SECURITY CHECK: Verify the admin is actually logged in
    const authData = await getCurrentAdmin();
    if (!authData || !authData.profile) {
      return NextResponse.json(
        { ok: false, message: "Sesi tamat. Sila log masuk semula." },
        { status: 401 }
      );
    }
    const adminId = authData.profile.id;

    // 2. PARSE REQUEST
    const body = await request.json();
    const { originalTxId, remarks } = body;

    if (!originalTxId || !remarks) {
      return NextResponse.json(
        { ok: false, message: "Sila berikan ID Transaksi dan catatan pembalikan." },
        { status: 400 }
      );
    }

    // 3. EXECUTE REVERSAL (Now using the REAL admin ID!)
    const pembalikan = await reverseTransaction(originalTxId, adminId, remarks);

    await prisma.$transaction(async (tx) => {
      const original = await tx.transaction.findUnique({
        where: { id: originalTxId },
        include: {
          resident: {
            select: {
              fullName: true,
              icNumber: true,
            },
          },
        },
      });

      await recordDataAuditLog(tx, {
        actor: authData,
        moduleName: "Transaksi",
        actionType: "REVERSAL",
        target: formatAuditTarget([
          original?.transactionNo ?? originalTxId,
          original?.resident?.fullName,
          original?.resident?.icNumber ? `No. KP ${original.resident.icNumber}` : null,
        ]),
        entityType: "TRANSACTION",
        entityId: originalTxId,
        summary: "Membalikkan transaksi dan menjana rekod imbangan.",
        details: [
          `Transaksi asal: ${original?.transactionNo ?? originalTxId}.`,
          `Transaksi pembalikan: ${pembalikan.transactionNo ?? pembalikan.id}.`,
          `Catatan: ${remarks}.`,
        ],
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Pembalikan berjaya direkodkan.",
      data: pembalikan,
    });

  } catch (error: any) {
    console.error("[API_TRANSACTIONS_REVERSE]", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Ralat semasa melakukan pembalikan." },
      { status: 500 }
    );
  }
}
