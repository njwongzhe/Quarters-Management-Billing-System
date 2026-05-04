import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  getBayaranPaymentDate,
  mapUploadedDocumentForQueue,
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Dokumen tidak ditemui." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        document: mapUploadedDocumentForQueue(document),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mendapatkan dokumen.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { extractResult } = body ?? {};

    if (!extractResult) {
      return NextResponse.json(
        { success: false, message: "Data ekstrak tidak lengkap." },
        { status: 400 },
      );
    }

    const document = await prisma.$transaction(
      async (tx) => {
        if (extractResult.documentType === "bayaran") {
          const nextPaymentIds = new Set(
            extractResult.records
              .map((record: { paymentId?: string }) => record.paymentId)
              .filter(Boolean),
          );

          const existingPayments = await tx.$queryRaw<{ id: string }[]>`
            SELECT "id"
            FROM "Payment"
            WHERE "uploadedDocumentId" = ${id}::uuid
              AND "recordStatus" = 'PENDING'::"RecordStatus"
          `;
          const paymentIdsToDelete = existingPayments
            .map((payment) => payment.id)
            .filter((paymentId) => !nextPaymentIds.has(paymentId));

          if (paymentIdsToDelete.length > 0) {
            await tx.$executeRaw`
              DELETE FROM "Payment"
              WHERE "id" IN (${Prisma.join(
                paymentIdsToDelete.map((paymentId) => Prisma.sql`${paymentId}::uuid`),
              )})
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }

          const paymentDate = getBayaranPaymentDate(extractResult.paymentMonth);

          for (const record of extractResult.records) {
            if (!record.paymentId) {
              continue;
            }

            await tx.$executeRaw`
              UPDATE "Payment"
              SET
                "paymentDate" = ${paymentDate},
                "receiptNo" = ${record.noRujukan || null},
                "amount" = ${record.amaunRm}::numeric,
                "description" = ${record.catatan || "bayaran"},
                "updatedAt" = NOW()
              WHERE "id" = ${record.paymentId}::uuid
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }
        }

        if (extractResult.documentType === "tunggakan") {
          const nextArrearsSummaryIds = new Set(
            extractResult.records
              .map((record: { arrearsSummaryId?: string }) => record.arrearsSummaryId)
              .filter(Boolean),
          );

          const existingArrearsSummaries = await tx.$queryRaw<{ id: string }[]>`
            SELECT "id"
            FROM "ArrearsSummary"
            WHERE "uploadedDocumentId" = ${id}::uuid
              AND "recordStatus" = 'PENDING'::"RecordStatus"
          `;
          const arrearsSummaryIdsToDelete = existingArrearsSummaries
            .map((summary) => summary.id)
            .filter((summaryId) => !nextArrearsSummaryIds.has(summaryId));

          if (arrearsSummaryIdsToDelete.length > 0) {
            await tx.$executeRaw`
              DELETE FROM "ArrearsSummary"
              WHERE "id" IN (${Prisma.join(
                arrearsSummaryIdsToDelete.map(
                  (summaryId) => Prisma.sql`${summaryId}::uuid`,
                ),
              )})
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }

          for (const record of extractResult.records) {
            if (!record.arrearsSummaryId) {
              continue;
            }

            await tx.$executeRaw`
              UPDATE "ArrearsSummary"
              SET
                "totalArrearsAmount" = ${record.jumlahTunggakan || "0"}::numeric,
                "description" = ${"tunggakan"},
                "updatedAt" = NOW()
              WHERE "id" = ${record.arrearsSummaryId}::uuid
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }
        }

        return tx.uploadedDocument.update({
          where: { id },
          data: {
            remark: JSON.stringify(extractResult),
          },
          include: {
            uploadedBy: {
              select: {
                fullName: true,
              },
            },
          },
        });
      },
      uploadedDocumentTransactionOptions,
    );

    return NextResponse.json({
      success: true,
      data: {
        document: mapUploadedDocumentForQueue(document),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mengemas kini dokumen.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          DELETE FROM "Payment"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "ArrearsSummary"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "Unit"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "QuarterCategory"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "Resident"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.uploadedDocument.delete({
          where: { id },
        });
      },
      uploadedDocumentTransactionOptions,
    );

    return NextResponse.json({
      success: true,
      message: "Dokumen berjaya dipadam.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal memadam dokumen.",
      },
      { status: 500 },
    );
  }
}
