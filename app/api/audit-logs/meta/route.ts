import { NextResponse } from "next/server";

import { getAuditLogFilterOptions } from "@/lib/audit/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAuditLogFilterOptions();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan pilihan penapisan audit.",
      },
      { status: 500 },
    );
  }
}
