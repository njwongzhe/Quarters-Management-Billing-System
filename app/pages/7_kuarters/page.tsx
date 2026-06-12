import KuartersPageClient from "./components/KuartersPageClient";
import { getQuarterCategoriesPageData } from "@/lib/quarters/quarter-categories";

export const dynamic = "force-dynamic";

export default async function KuartersPage() {
  const data = await getQuarterCategoriesPageData();

  return (
    <KuartersPageClient
      initialData={{
        summary: data.summary,
        quarterCategories: data.quarterCategories,
      }}
    />
  );
}
