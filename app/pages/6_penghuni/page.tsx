import { getResidentsList } from "@/lib/residents/resident-list";

import PenghuniPageClient from "./components/PenghuniPageClient";

export const dynamic = "force-dynamic";

export default async function PenghuniPage({
  searchParams,
}: {
  searchParams?: Promise<{
    targetId?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const targetResidentId =
    typeof resolvedSearchParams?.targetId === "string"
      ? resolvedSearchParams.targetId.trim()
      : "";
  const residents = await getResidentsList();

  return (
    <PenghuniPageClient
      initialResidents={residents}
      targetResidentId={targetResidentId}
    />
  );
}
