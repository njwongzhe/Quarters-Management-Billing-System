import { NextResponse } from "next/server";

import {
  getAuditLogFilterOptions,
  getAuditLogPage,
  parseAuditLogFilters,
} from "@/lib/audit/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const filters = parseAuditLogFilters({
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      actionType: searchParams.get("actionType") ?? undefined,
      adminId: searchParams.get("adminId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    const [data, filterOptions] = await Promise.all([
    const [auditPage, filterOptions] = await Promise.all([
      getAuditLogPage(page, filters),
      getAuditLogFilterOptions(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        ...auditPage,
        filterOptions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan rekod jejak audit.",
      },
      { status: 500 },
    );
  }
}
