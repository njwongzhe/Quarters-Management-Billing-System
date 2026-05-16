import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildQuarterCategoryUnitsDetailInclude, mapQuarterCategoryUnitsDetailForApi } from "@/lib/quarter-units";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const quarterCategory = await prisma.quarterCategory.findFirst({ where: { id }, include: buildQuarterCategoryUnitsDetailInclude() });

    if (!quarterCategory) {
      return NextResponse.json({ success: false, message: "Kuarters tidak ditemui." }, { status: 404 });
    }

    const detail = mapQuarterCategoryUnitsDetailForApi(quarterCategory);

    return NextResponse.json({ success: true, message: "Data unit kuarters berjaya diambil.", data: { quarterCategory: detail, meta: { totalRecords: detail.units.length } } });
  } catch (error) {
    console.error("Gagal mendapatkan data unit kuarters:", error);
    return NextResponse.json({ success: false, message: "Ralat pelayan berlaku semasa mendapatkan data unit kuarters." }, { status: 500 });
  }
}
