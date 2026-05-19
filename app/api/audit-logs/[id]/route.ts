import { NextResponse } from "next/server";

import { getAuditLogDetail } from "@/lib/audit/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auditLog = await getAuditLogDetail(id);

    if (!auditLog) {
      return NextResponse.json(
        {
          success: false,
          message: "Rekod jejak audit tidak ditemui.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        auditLog,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan butiran jejak audit.",
      },
      { status: 500 },
    );
  }
}
