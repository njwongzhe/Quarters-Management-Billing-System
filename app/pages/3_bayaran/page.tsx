import { Suspense } from "react";

import BayaranPageClient from "./components/BayaranPageClient";

export const dynamic = "force-dynamic";

export default function BayaranPage() {
  return (
    <Suspense>
      <BayaranPageClient />
    </Suspense>
  );
}
