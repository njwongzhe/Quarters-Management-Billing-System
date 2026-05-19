import { NextResponse } from "next/server";

import { getAuditLogExportRows, parseAuditLogFilters } from "@/lib/audit/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseAuditLogFilters({
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      actionType: searchParams.get("actionType") ?? undefined,
      adminId: searchParams.get("adminId") ?? undefined,
    });
    const records = await getAuditLogExportRows(filters);

    return NextResponse.json({
      success: true,
      data: {
        records,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengeksport rekod jejak audit.",
      },
      { status: 500 },
    );
  }
}
