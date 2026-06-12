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
    const includeFilterOptions =
      searchParams.get("includeFilterOptions") !== "false";
    const [auditPage, filterOptions] = await Promise.all([
      getAuditLogPage(page, filters),
      includeFilterOptions
        ? getAuditLogFilterOptions()
        : Promise.resolve(undefined),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...auditPage,
        ...(filterOptions ? { filterOptions } : {}),
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
