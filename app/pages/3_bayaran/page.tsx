import { Suspense } from "react";

import BayaranPageClient from "./components/BayaranPageClient";
import { getAppTimeZoneDateParts } from "@/lib/date-time";
import { getBayaranPageData } from "@/lib/payments/bayaran-page";

export const dynamic = "force-dynamic";

export default async function BayaranPage() {
  const now = new Date();
  const { year, month } = getAppTimeZoneDateParts(now);
  const currentPaymentMonthKey = `${year}-${String(month).padStart(2, "0")}`;
  const initialData = await getBayaranPageData(now);

  return (
    <Suspense>
      <BayaranPageClient
        currentPaymentMonthKey={currentPaymentMonthKey}
        initialData={initialData}
      />
    </Suspense>
  );
}
