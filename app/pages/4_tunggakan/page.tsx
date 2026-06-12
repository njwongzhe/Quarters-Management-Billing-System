import { Suspense } from "react";
import TunggakanPageClient from "./components/ArrearsPageClient";
import { getArrearsPageData } from "@/lib/arrears/arrears-list";
import {
  getAppTimeZoneDateParts,
  getMonthStartInAppTimeZone,
} from "@/lib/date-time";

export const dynamic = "force-dynamic";

export default async function TunggakanPage() {
  const now = new Date();
  const { year, month } = getAppTimeZoneDateParts(now);
  const initialChargeMonth = `${year}-${String(month).padStart(2, "0")}`;
  const initialData = await getArrearsPageData(
    getMonthStartInAppTimeZone(now),
  );

  return (
    <Suspense>
      <TunggakanPageClient
        initialChargeMonth={initialChargeMonth}
        initialData={initialData.data}
        initialSummary={initialData.summary}
      />
    </Suspense>
  );
}
