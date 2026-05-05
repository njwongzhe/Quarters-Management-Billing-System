import { NextResponse } from "next/server";

import {
  createPendingBayaranRows,
  createPendingKuartersRows,
  createPendingPenghuniRows,
  createPendingTunggakanRows,
  documentCategoryForKind,
  mapUploadedDocumentForQueue,
} from "@/lib/uploaded-documents";
import { createAuditLog } from "@/lib/audit-logs";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const documentCategories = ["BAYARAN", "TUNGGAKAN", "PENGHUNI", "KUARTERS"] as const;
const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const normalizedCategory = category?.toUpperCase();

    const documents = await prisma.uploadedDocument.findMany({
      where: {
        recordStatus: "PENDING",
        ...(normalizedCategory &&
        documentCategories.includes(
          normalizedCategory as (typeof documentCategories)[number],
        )
          ? {
              category: normalizedCategory as (typeof documentCategories)[number],
            }
          : {}),
      },
      orderBy: {
        uploadedAt: "desc",
      },
      include: {
        uploadedBy: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        documents: documents
          .map(mapUploadedDocumentForQueue)
          .filter((document) => document !== null),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan barisan pemprosesan.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const body = await request.json();
    const { kind, fileName, fileType, fileSize, extractResult } = body ?? {};

    if (
      !kind ||
      !fileName ||
      !fileType ||
      typeof fileSize !== "number" ||
      !extractResult
    ) {
      return NextResponse.json(
        { success: false, message: "Data dokumen tidak lengkap." },
        { status: 400 },
      );
    }

    const document = await prisma.$transaction(
      async (tx) => {
        const createdDocument = await tx.uploadedDocument.create({
          data: {
            fileName,
            originalName: fileName,
            fileType,
            fileSize,
            category: documentCategoryForKind(kind),
            recordStatus: "PENDING",
            description: "Menunggu semakan dan pengesahan data ekstrak.",
            remark: JSON.stringify(extractResult),
          },
        });

        const bayaranExtractResult = await createPendingBayaranRows(
          tx,
          createdDocument.id,
          extractResult,
        );
        const tunggakanExtractResult = await createPendingTunggakanRows(
          tx,
          createdDocument.id,
          bayaranExtractResult,
        );
        const penghuniExtractResult = await createPendingPenghuniRows(
          tx,
          createdDocument.id,
          tunggakanExtractResult,
        );
        const enrichedExtractResult = await createPendingKuartersRows(
          tx,
          createdDocument.id,
          penghuniExtractResult,
        );

        const updatedDocument = await tx.uploadedDocument.update({
          where: {
            id: createdDocument.id,
          },
          data: {
            remark: JSON.stringify(enrichedExtractResult),
          },
          include: {
            uploadedBy: {
              select: {
                fullName: true,
              },
            },
          },
        });

        await createAuditLog(tx, {
          actor: currentAdmin,
          moduleName: "Muat Naik",
          targetData: `${documentCategoryForKind(kind)} / ${fileName}`,
          actionType: "IMPORT_EXTRACT",
          description: `Muat naik dokumen ${documentCategoryForKind(kind)}: ${fileName}.`,
        });

        return updatedDocument;
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
          error instanceof Error
            ? error.message
            : "Gagal menyimpan dokumen muat naik.",
      },
      { status: 500 },
    );
  }
}
