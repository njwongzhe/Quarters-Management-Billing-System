import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  mapQuarterCategoryUnitsDetailForApi,
  QuarterCategoryUnitsDetailInclude,
  type QuarterCategoryUnitsDetail,
} from "@/lib/quarter-units";

import type { KuartersNotice } from "../components/kuartersHelpers";
import KuartersCategoryDetailPageClient from "./components/KuartersCategoryDetailPageClient";

export const dynamic = "force-dynamic";

type KuartersCategoryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getInitialKuartersCategoryDetailData(id: string): Promise<{
  initialData: QuarterCategoryUnitsDetail;
  initialNotice: KuartersNotice | null;
  isNotFound: boolean;
}> {
  try {
    const QuarterCategory = await prisma.quarterCategory.findUnique({
      where: {
        id,
      },
      include: QuarterCategoryUnitsDetailInclude,
    });

    if (!QuarterCategory) {
      return {
        initialData: {
          id,
          categoryName: "",
          rates: {
            rentalPrice: null,
            maintenancePrice: null,
            penaltyPrice: null,
          },
          summary: null,
          units: [],
        },
        initialNotice: null,
        isNotFound: true,
      };
    }

    return {
      initialData: mapQuarterCategoryUnitsDetailForApi(QuarterCategory),
      initialNotice: null,
      isNotFound: false,
    };
  } catch (error) {
    console.error("Gagal memuatkan butiran kategori kuarters:", error);

    return {
      initialData: {
        id,
        categoryName: "Maklumat kategori kuarters",
        rates: {
          rentalPrice: null,
          maintenancePrice: null,
          penaltyPrice: null,
        },
        summary: null,
        units: [],
      },
      initialNotice: {
        tone: "error",
        message: "Gagal mendapatkan data butiran kategori kuarters.",
      },
      isNotFound: false,
    };
  }
}

export default async function KuartersCategoryDetailPage({
  params,
}: KuartersCategoryDetailPageProps) {
  const { id } = await params;
  const { initialData, initialNotice, isNotFound } =
    await getInitialKuartersCategoryDetailData(id);

  if (isNotFound) {
    notFound();
  }

  return (
    <KuartersCategoryDetailPageClient
      initialData={initialData}
      initialNotice={initialNotice}
    />
  );
}
