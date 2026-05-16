import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapQuarterCategoryForApi, buildQuarterCategorySummary } from "@/lib/quarter-categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [quarterCategories, totalUnits, occupiedUnits, vacantUnits] =
      await prisma.$transaction([
        prisma.quarterCategory.findMany({
          orderBy: { categoryName: "asc" },
          include: { _count: { select: { units: true } } },
        }),
        prisma.unit.count(),
        prisma.unit.count({ where: { status: "OCCUPIED" } }),
        prisma.unit.count({ where: { status: "VACANT" } }),
      ]);

    return NextResponse.json({
      success: true,
      message: "Data kuarters berjaya diambil.",
      data: {
        summary: buildQuarterCategorySummary({ totalUnits, occupiedUnits, vacantUnits }),
        quarterCategories: quarterCategories.map(mapQuarterCategoryForApi),
        meta: { totalRecords: quarterCategories.length },
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan data kuarters:", error);
    return NextResponse.json({ success: false, message: "Ralat pelayan berlaku semasa mendapatkan data kuarters." }, { status: 500 });
  }
}
