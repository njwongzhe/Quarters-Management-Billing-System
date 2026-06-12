import Link from "next/link";

import Icon from "@/app/components/Icon/Icon";
import { getDashboardSummary } from "@/lib/dashboard/dashboard";

import LamanUtamaAlerts from "./components/LamanUtamaAlerts";
import LamanUtamaAnalysis from "./components/LamanUtamaAnalysis";
import LamanUtamaBanner from "./components/LamanUtamaBanner";
import LamanUtamaHeader from "./components/LamanUtamaHeader";
import LamanUtamaOccupancyGauge from "./components/LamanUtamaOccupancyGauge";

export const dynamic = "force-dynamic";

export default async function LamanUtamaPage() {
  const data = await loadDashboardData();

  if (!data) {
    return (
      <div className="flex min-h-100 w-full select-none flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red/10 text-red">
          <Icon icon="warning" size={24} />
        </div>
        <h3 className="text-lg font-bold text-dark-blue">
          Ralat Memuatkan Data
        </h3>
        <p className="max-w-md text-sm text-content-muted">
          Gagal mengambil data papan pemuka. Sila cuba semula.
        </p>
        <Link
          href="/pages/1_laman_utama"
          className="mt-2 rounded-xl bg-dark-blue px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Cuba Lagi
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col gap-4 pb-20">
      <LamanUtamaHeader />

      <LamanUtamaBanner
        isLoading={false}
        monthlyAmount={data.monthlyAmount}
        monthlyChange={data.monthlyChange}
        monthlyPercentage={data.monthlyPercentage}
        totalAmount={data.totalAmount}
        totalChange={data.totalChange}
        totalPercentage={data.totalPercentage}
      />

      <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-2">
        <LamanUtamaOccupancyGauge
          isLoading={false}
          initialTotal={data.occupancyTotal}
          initialOccupied={data.occupancyOccupied}
        />

        <LamanUtamaAlerts
          isLoading={false}
          arrearsAmount={data.arrearsAmount}
          arrearsCount={data.arrearsCount}
          pendingCount={data.pendingCount}
          pendingUploadsToday={data.pendingUploadsToday}
          pendingCategory={data.pendingCategory}
        />
      </div>

      <LamanUtamaAnalysis items={data.analysis} isLoading={false} />
    </div>
  );
}

async function loadDashboardData() {
  try {
    return await getDashboardSummary();
  } catch (error) {
    console.error("[DASHBOARD_PAGE_ERROR]", error);
    return null;
  }
}
