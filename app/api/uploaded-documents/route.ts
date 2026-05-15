import { NextResponse } from "next/server";

import {
  mapUploadedDocumentForQueue,
} from "@/lib/uploaded-document/documents";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const documentCategories = ["BAYARAN", "TUNGGAKAN", "PENGHUNI", "KUARTERS"] as const;

// GET handler to fetch pending uploaded documents for processing queue
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const normalizedCategory = category?.toUpperCase();

    const documents = await prisma.uploadedDocument.findMany({
      where: {
        ...(normalizedCategory &&
        documentCategories.includes(
          normalizedCategory as (typeof documentCategories)[number],
        )
          ? { category: normalizedCategory as (typeof documentCategories)[number] }
          : {}),
      },
      orderBy: {
        uploadedAt: "desc",
      },
      select: {
        id: true,
        category: true,
        fileName: true,
        originalName: true,
        fileType: true,
        fileSize: true,
        uploadedAt: true,
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
        documents: documents.map(mapUploadedDocumentForQueue).filter(
          (document) => document !== null,
        ),
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
