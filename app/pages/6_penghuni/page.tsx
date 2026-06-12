import { getResidentsList } from "@/lib/residents/resident-list";

import PenghuniPageClient from "./components/PenghuniPageClient";

export const dynamic = "force-dynamic";

export default async function PenghuniPage() {
  const residents = await getResidentsList();

  return <PenghuniPageClient initialResidents={residents} />;
}
