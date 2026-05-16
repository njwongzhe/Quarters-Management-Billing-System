import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import {
  mapUploadedDocumentForReview,
} from "@/lib/uploaded-document/documents";
import { createAuditLog } from "@/lib/audit-logs";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
      include: { uploadedBy: { select: { fullName: true } } },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Dokumen tidak ditemui." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { document: await mapUploadedDocumentForReview(document) },
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const { id } = await context.params;

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const document = await tx.uploadedDocument.findUnique({
          where: { id },
          select: { category: true, fileName: true, originalName: true },
        });

        await tx.uploadedDocument.delete({ where: { id } });

        await createAuditLog(tx, {
          actor: currentAdmin,
          moduleName: "Muat Naik",
          targetData: `${document?.category ?? "DOKUMEN"} / ${document?.originalName ?? document?.fileName ?? id}`,
          actionType: "DELETE",
          description: `Memadam dokumen belum disahkan ${document?.category ?? "DOKUMEN"}: ${document?.originalName ?? document?.fileName ?? id}.`,
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
