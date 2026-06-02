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

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const detail = await getBayaranPaymentDetail(
      id,
      parsePaymentMonth(searchParams.get("paymentMonth")),
    );

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

function parsePaymentMonth(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return new Date();
  }

  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1, 1);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    Number.isNaN(date.getTime())
  ) {
    return new Date();
  }

  return date;
}
