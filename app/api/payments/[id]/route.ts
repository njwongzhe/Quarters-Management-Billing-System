import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { getBayaranPaymentDetail } from "@/lib/payments/bayaran-detail";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const detail = await getBayaranPaymentDetail(id);

    if (!detail) {
      return NextResponse.json(
        { success: false, message: "Rekod bayaran tidak ditemui." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Butiran bayaran berjaya diambil.",
      data: {
        payment: detail,
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan butiran bayaran:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Ralat pelayan berlaku semasa mendapatkan butiran bayaran.",
      },
      { status: 500 },
    );
  }
}
