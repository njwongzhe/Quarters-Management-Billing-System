import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { mapQuarterUnitDetailsForApi, quarterUnitDetailsInclude } from "@/lib/quarter-units";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; unitId: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { id, unitId } = await context.params;

  try {
    const unit = await prisma.unit.findFirst({ where: { id: unitId }, include: quarterUnitDetailsInclude });

    if (!unit || unit.quarterCategory.id !== id) {
      return NextResponse.json({ success: false, message: "Unit kuarters tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Maklumat unit kuarters berjaya diambil.", data: { unit: mapQuarterUnitDetailsForApi(unit) } });
  } catch (error) {
    console.error("Gagal mendapatkan maklumat unit kuarters:", error);
    return NextResponse.json({ success: false, message: "Ralat pelayan berlaku semasa mendapatkan maklumat unit kuarters." }, { status: 500 });
  }
}
