import { NextResponse } from "next/server";

import {
  applyVerifiedPenghuniOccupancy,
  parseExtractResult,
} from "@/lib/uploaded-documents";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

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
        const document = await tx.uploadedDocument.findUnique({
          where: { id },
          select: {
            remark: true,
            recordStatus: true,
          },
        });

        if (!document) {
          throw new Error("Dokumen tidak ditemui.");
        }

        if (document.recordStatus !== "PENDING") {
          throw new Error("Dokumen ini sudah diproses.");
        }

        const extractResult = parseExtractResult(document.remark);

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
        if (extractResult) {
          await applyVerifiedPenghuniOccupancy(tx, extractResult);
        }
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
      uploadedDocumentTransactionOptions,
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
