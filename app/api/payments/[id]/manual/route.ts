import { NextResponse } from "next/server";

import { createAuditLog } from "@/lib/audit/audit-logs";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { prisma } from "@/lib/prisma";
import {
  createManualBayaranPayments,
  getBayaranPaymentDetail,
  type ManualPaymentRowInput,
} from "@/lib/payments/payment-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManualPaymentRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: ManualPaymentRouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { ok: false, message: "Akses ditolak. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const rows =
      body && typeof body === "object" && "payments" in body
        ? (body as { payments?: ManualPaymentRowInput[] }).payments
        : null;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { ok: false, message: "Format rekod bayaran tidak sah." },
        { status: 400 },
      );
    }

    const createdPaymentIds = await createManualBayaranPayments(
      id,
      rows,
      currentAdmin.profile.id,
    );

    const detail = await getBayaranPaymentDetail(id);

    await prisma.$transaction((tx) =>
      createAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Semakan Bayaran",
        targetData: detail?.profile.fullName ?? id,
        actionType: "CREATE",
        description: `Menambah ${createdPaymentIds.length} rekod bayaran manual.`,
        entityType: "PAYMENT",
        entityId: createdPaymentIds[0] ?? null,
      }),
    );

    return NextResponse.json({
      ok: true,
      message: "Rekod bayaran manual berjaya disimpan.",
      data: detail,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Ralat semasa menyimpan bayaran manual.",
      },
      { status: 500 },
    );
  }
}
