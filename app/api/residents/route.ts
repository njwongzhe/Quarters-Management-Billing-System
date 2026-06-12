import { NextResponse } from "next/server";

import { getResidentsList } from "@/lib/residents/resident-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const residents = await getResidentsList(query);

    return NextResponse.json({
      success: true,
      message: "Data penghuni berjaya diambil.",
      data: {
        residents,
        meta: {
          totalRecords: residents.length,
          query,
        },
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan senarai penghuni:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mendapatkan senarai penghuni.",
      },
      {
        status: 500,
      },
    );
  }
}
