import {
  buildQuarterCategorySummary,
  mapQuarterCategoryForApi,
} from "@/lib/quarter-categories";
import { prisma } from "@/lib/prisma";

import KuartersPageClient from "./components/KuartersPageClient";
import type {
  KuartersNotice,
  KuartersPageInitialData,
} from "./components/kuartersHelpers";

export const dynamic = "force-dynamic";

async function getInitialKuartersPageData(): Promise<{
  initialData: KuartersPageInitialData;
  initialNotice: KuartersNotice | null;
}> {
  try {
    const [quarterCategories, totalUnits, occupiedUnits, vacantUnits] =
      await prisma.$transaction([
        prisma.quarterCategory.findMany({
          orderBy: {
            categoryName: "asc",
          },
          include: {
            _count: {
              select: {
                units: true,
              },
            },
          },
        }),
        prisma.unit.count(),
        prisma.unit.count({
          where: {
            status: "OCCUPIED",
          },
        }),
        prisma.unit.count({
          where: {
            status: "VACANT",
          },
        }),
      ]);

    return {
      initialData: {
        summary: buildQuarterCategorySummary({
          totalUnits,
          occupiedUnits,
          vacantUnits,
        }),
        quarterCategories: quarterCategories.map(mapQuarterCategoryForApi),
      },
      initialNotice: null,
    };
  } catch (error) {
    console.error("Gagal memuatkan halaman pengurusan kuarters:", error);

    return {
      initialData: {
        summary: null,
        quarterCategories: [],
      },
      initialNotice: {
        tone: "error",
        message: "Gagal mendapatkan data kategori kuarters.",
      },
    };
  }
}

export default async function KuartersPage() {
  const { initialData, initialNotice } = await getInitialKuartersPageData();

  return (
    <KuartersPageClient
      initialData={initialData}
      initialNotice={initialNotice}
    />
  );
}
