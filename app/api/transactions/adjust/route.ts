import { NextRequest, NextResponse } from "next/server";
import { adjustTransaction } from "@/lib/transactions";

export async function POST(request: NextRequest) {
  try {
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

    // TODO: Replace with actual auth user ID
    const MOCK_ADMIN_ID = "00000000-0000-0000-0000-000000000000";

    const pelarasan = await adjustTransaction(originalTxId, MOCK_ADMIN_ID, Number(newAmount), remarks);

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