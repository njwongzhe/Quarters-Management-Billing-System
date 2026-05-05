import { NextRequest, NextResponse } from "next/server";
import { reverseTransaction } from "@/lib/transactions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalTxId, remarks } = body;

    if (!originalTxId || !remarks) {
      return NextResponse.json(
        { ok: false, message: "Sila berikan ID Transaksi dan catatan pembalikan." },
        { status: 400 }
      );
    }

    // TODO: Replace with actual auth user ID when you integrate session management
    const MOCK_ADMIN_ID = "00000000-0000-0000-0000-000000000000"; // Must be a valid UUID format

    const pembalikan = await reverseTransaction(originalTxId, MOCK_ADMIN_ID, remarks);

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