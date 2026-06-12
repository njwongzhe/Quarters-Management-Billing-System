import { NextResponse } from "next/server";

import {
  getUploadedDocumentsForQueue,
} from "@/lib/uploaded-document/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const documentCategories = ["BAYARAN", "TUNGGAKAN", "PENGHUNI", "KUARTERS"] as const;

// GET handler to fetch pending uploaded documents for processing queue
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const normalizedCategory = category?.toUpperCase();

    const validCategory =
      normalizedCategory &&
      documentCategories.includes(
        normalizedCategory as (typeof documentCategories)[number],
      )
        ? (normalizedCategory as (typeof documentCategories)[number])
        : undefined;
    const documents = await getUploadedDocumentsForQueue(validCategory);

    return NextResponse.json({
      success: true,
      data: {
        documents,
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
