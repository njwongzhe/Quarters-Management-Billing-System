import {
  buildQuarterClassSummary,
  mapQuarterClassForApi,
} from "@/lib/quarter-classes";
import { prisma } from "@/lib/prisma";

import PenghuniPageClient from "./components/PenghuniPageClient";
import type {
  PenghuniPageInitialData,
  PenghuniNotice,
} from "./components/penghuniHelpers";

export const dynamic = "force-dynamic";

async function getInitialPenghuniPageData(): Promise<{
  initialData: PenghuniPageInitialData;
  initialNotice: PenghuniNotice | null;
}> {
  try {
    const [quarterClasses, totalUnits, occupiedUnits, vacantUnits] =
      await prisma.$transaction([
        prisma.quarterClass.findMany({
          orderBy: {
            className: "asc",
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
        summary: buildQuarterClassSummary({
          totalUnits,
          occupiedUnits,
          vacantUnits,
        }),
        quarterClasses: quarterClasses.map(mapQuarterClassForApi),
      },
      initialNotice: null,
    };
  } catch (error) {
    console.error("Gagal memuatkan halaman pengurusan kuarters:", error);

    return {
      initialData: {
        summary: null,
        quarterClasses: [],
      },
      initialNotice: {
        tone: "error",
        message: "Gagal mendapatkan data kelas kuarters.",
      },
    };
  }
}

export default async function PenghuniPage() {
  const { initialData, initialNotice } = await getInitialPenghuniPageData();

  return (
    <PenghuniPageClient
      initialData={initialData}
      initialNotice={initialNotice}
    />
  );
}
