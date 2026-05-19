import { NextRequest, NextResponse } from "next/server";
import { reverseTransaction } from "@/lib/transactions/transactions";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

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