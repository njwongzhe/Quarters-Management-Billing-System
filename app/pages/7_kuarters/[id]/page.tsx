import KuartersCategoryDetailPageClient from "./components/KuartersCategoryDetailPageClient";

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

  return (
    <KuartersCategoryDetailPageClient
      categoryId={id}
      initialTargetUnitId={initialTargetUnitId}
    />
  );
}
