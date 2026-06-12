import {
  categoryByDraftKind,
  reviewRoutes,
} from "./components/constants";
import MuatNaikPageClient from "./components/MuatNaikPageClient";
import type { Category } from "./components/types";
import { getUploadedDocumentsForQueue } from "@/lib/uploaded-document/documents";

type MuatNaikPageProps = {
  searchParams: Promise<{
    kategori?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MuatNaikPage({
  searchParams,
}: MuatNaikPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialCategory = getCategoryFromParam(
    resolvedSearchParams?.kategori ?? null,
  );
  const initialKind = reviewRoutes[initialCategory];
  const initialDrafts = await getUploadedDocumentsForQueue(
    initialKind.toUpperCase() as "BAYARAN" | "TUNGGAKAN" | "PENGHUNI" | "KUARTERS",
  );

  return (
    <MuatNaikPageClient
      initialCategory={initialCategory}
      initialDrafts={initialDrafts}
    />
  );
}

function getCategoryFromParam(categoryParam: string | null): Category {
  if (!categoryParam) {
    return "Bayaran";
  }

  return categoryByDraftKind[
    categoryParam as keyof typeof categoryByDraftKind
  ] ?? "Bayaran";
}
