import { notFound } from "next/navigation";

import ExtractReviewPage, {
  type ReviewKind,
} from "../../components/ExtractReviewPage";

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
};

export default async function SemakanEkstrakPage({
  params,
}: SemakanEkstrakPageProps) {
  const { jenis } = await params;

  if (!reviewKinds.has(jenis)) {
    notFound();
  }

  return <ExtractReviewPage kind={jenis as ReviewKind} />;
}
