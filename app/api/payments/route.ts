import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
  getBayaranPageData,
  parseBayaranPaymentMonth,
} from "@/lib/payments/bayaran-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentMonth = parseBayaranPaymentMonth(
      searchParams.get("paymentMonth"),
    );
    const data = await getBayaranPageData(paymentMonth);

    return NextResponse.json({
      success: true,
      message: "Data bayaran berjaya diambil.",
      data,
    });
  } catch (error) {
    console.error("Gagal mendapatkan data bayaran:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Ralat pelayan berlaku semasa mendapatkan data bayaran.",
      },
      { status: 500 },
    );
  }
}
