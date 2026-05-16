import { notFound } from "next/navigation";

import ExtractReviewPage, {
  type ReviewKind,
} from "./components/ExtractReviewPage";

const reviewKinds = new Set<string>([
  "bayaran",
  "tunggakan",
  "penghuni",
  "kuarters",
]);

type SemakanEkstrakPageProps = {
  params: Promise<{
    jenis: string;
  }>;
  searchParams: Promise<{
    draftId?: string;
  }>;
};

export default async function SemakanEkstrakPage({
  params,
  searchParams,
}: SemakanEkstrakPageProps) {
  const { jenis } = await params;
  const { draftId = "" } = await searchParams;

  if (!reviewKinds.has(jenis)) {
    notFound();
  }

  return <ExtractReviewPage draftId={draftId} kind={jenis as ReviewKind} />;
}
