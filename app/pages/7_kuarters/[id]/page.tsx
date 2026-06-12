import KuartersCategoryDetailPageClient from "./components/KuartersCategoryDetailPageClient";
import { getQuarterCategoryUnitsDetail } from "@/lib/quarters/quarter-units";

export const dynamic = "force-dynamic";

type KuartersCategoryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    targetUnitId?: string;
    unitId?: string;
  }>;
};

export default async function KuartersCategoryDetailPage({
  params,
  searchParams,
}: KuartersCategoryDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const initialTargetUnitId =
    resolvedSearchParams?.targetUnitId ?? resolvedSearchParams?.unitId ?? "";
  const initialData = await getQuarterCategoryUnitsDetail(id);

  return (
    <KuartersCategoryDetailPageClient
      categoryId={id}
      initialData={initialData ?? undefined}
      initialTargetUnitId={initialTargetUnitId}
    />
  );
}
