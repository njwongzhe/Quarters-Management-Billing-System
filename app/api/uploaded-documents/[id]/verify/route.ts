import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const verifiedAt = new Date();

    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          UPDATE "Resident"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "QuarterCategory"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "Unit"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "ArrearsSummary"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "Payment"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.uploadedDocument.update({
          where: {
            id,
          },
          data: {
            recordStatus: "VERIFIED",
            verifiedAt,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );

    return NextResponse.json({
      success: true,
      message: "Data berjaya disahkan.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mengesahkan data.",
      },
      { status: 500 },
    );
  }
}
