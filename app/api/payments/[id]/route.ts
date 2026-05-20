import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { getBayaranPaymentDetail } from "@/lib/payments/payment-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: PaymentRouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { ok: false, message: "Akses ditolak. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const detail = await getBayaranPaymentDetail(id);

    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "Rekod bayaran tidak dijumpai." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: detail });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Ralat semasa mengambil butiran bayaran.",
      },
      { status: 500 },
    );
  }
}
