import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
  buildStats,
  mapPaymentExportRow,
  mapPaymentRow,
} from "@/lib/payments/bayaran-helpers";
import { getBayaranPaymentDetailsByIds } from "@/lib/payments/bayaran-detail";
import { getBayaranPaymentListData } from "@/lib/payments/bayaran-list-queries";

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
    const paymentMonth = parsePaymentMonth(searchParams.get("paymentMonth"));
    const { rows: payments, paymentStats } =
      await getBayaranPaymentListData(paymentMonth);
    const rows = payments.map(mapPaymentRow);
    const exportRows = payments.map(mapPaymentExportRow);
    const stats = buildStats(paymentStats);
    const detailsByPaymentId = await getBayaranPaymentDetailsByIds(
      rows.map((row) => row.id),
      { includeHistory: false, paymentMonth },
    );

    return NextResponse.json({
      success: true,
      message: "Data bayaran berjaya diambil.",
      data: {
        rows,
        exportRows,
        stats,
        detailsByPaymentId,
      },
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
