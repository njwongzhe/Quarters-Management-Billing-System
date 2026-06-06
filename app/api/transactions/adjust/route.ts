import { NextRequest, NextResponse } from "next/server";
import { adjustTransaction } from "@/lib/transactions/transactions";
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
    const { originalTxId, newAmount, remarks } = body;

    if (!originalTxId || newAmount === undefined || !remarks) {
      return NextResponse.json(
        { ok: false, message: "ID Transaksi, amaun baru, dan catatan adalah wajib." },
        { status: 400 }
      );
    }

    if (newAmount < 0) {
        return NextResponse.json(
            { ok: false, message: "Amaun tidak boleh bernilai negatif." },
            { status: 400 }
        );
    }

    // 3. EXECUTE ADJUSTMENT (Now using the REAL admin ID!)
    const pelarasan = await adjustTransaction(originalTxId, adminId, Number(newAmount), remarks);

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
        actionType: "ADJUSTMENT",
        target: formatAuditTarget([
          original?.transactionNo ?? originalTxId,
          original?.resident?.fullName,
          original?.resident?.icNumber ? `No. KP ${original.resident.icNumber}` : null,
        ]),
        entityType: "TRANSACTION",
        entityId: originalTxId,
        summary: "Melaraskan amaun transaksi.",
        details: [
          `Transaksi asal: ${original?.transactionNo ?? originalTxId}.`,
          `Transaksi pelarasan: ${pelarasan.transactionNo ?? pelarasan.id}.`,
          `Amaun baharu: RM ${Number(newAmount).toFixed(2)}.`,
          `Catatan: ${remarks}.`,
        ],
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Pelarasan berjaya direkodkan.",
      data: pelarasan,
    });

  } catch (error: any) {
    console.error("[API_TRANSACTIONS_ADJUST]", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Ralat semasa melakukan pelarasan." },
      { status: 500 }
    );
  }
}
