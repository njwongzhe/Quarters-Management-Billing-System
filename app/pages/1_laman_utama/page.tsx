"use client";

import { useEffect, useState } from "react";
import LamanUtamaHeader from "./components/LamanUtamaHeader";
import LamanUtamaBanner from "./components/LamanUtamaBanner";
import LamanUtamaOccupancyGauge from "./components/LamanUtamaOccupancyGauge";
import LamanUtamaAlerts from "./components/LamanUtamaAlerts";
import LamanUtamaAnalysis from "./components/LamanUtamaAnalysis";
import Icon from "@/app/components/Icon/Icon";

interface DashboardData {
  monthlyAmount: string;
  monthlyChange: string;
  monthlyPercentage: number;
  totalAmount: string;
  totalChange: string;
  totalPercentage: number;
  occupancyTotal: number;
  occupancyOccupied: number;
  occupancyVacant: number;
  arrearsAmount: string;
  arrearsCount: number;
  pendingCount: number;
  pendingUploadsToday: number;
  pendingCategory?: string;
  analysis: Array<{
    className: string;
    amount: string;
    settlementRate: number;
    opacity: number;
  }>;
}

export default function LamanUtamaPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchDashboard() {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Gagal mengambil data dari pelayan.");
        }
        const result = await response.json();
        if (isMounted) {
          if (result.success) {
            setData(result.data);
          } else {
            setError(result.error || "Ralat berlaku semasa memproses data.");
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Ralat sistem berlaku.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboard();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4 select-none">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-dark-blue rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-[#464651]">
          Memuatkan data papan pemuka...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4 text-center select-none p-6 bg-white border border-[#EFF4FF] rounded-xl shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red/10 text-red">
          <Icon icon="warning" size={24} />
        </div>
        <h3 className="text-lg font-bold text-dark-blue">Ralat Memuatkan Data</h3>
        <p className="text-sm text-[#464651] max-w-md">
          {error || "Tiada data yang diterima daripada pelayan."}
        </p>
        <button
          onClick={() => {
            setIsLoading(true);
            setError(null);
            // Quick trigger to refetch
            window.location.reload();
          }}
          className="px-4 py-2 mt-2 bg-dark-blue text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          Cuba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full pb-20 relative">
      {/* 1. Header Section */}
      <LamanUtamaHeader />

      {/* 2. Top Row Metric Card (Banner with Carousel) */}
      <LamanUtamaBanner
        monthlyAmount={data.monthlyAmount}
        monthlyChange={data.monthlyChange}
        monthlyPercentage={data.monthlyPercentage}
        totalAmount={data.totalAmount}
        totalChange={data.totalChange}
        totalPercentage={data.totalPercentage}
      />

      {/* 3. Middle Grid: Occupancy Gauge (Left) & Alerts (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
        {/* Occupancy Card (Left) */}
        <LamanUtamaOccupancyGauge
          initialTotal={data.occupancyTotal}
          initialOccupied={data.occupancyOccupied}
        />

        {/* Warning & Alerts Card (Right) */}
        <LamanUtamaAlerts
          arrearsAmount={data.arrearsAmount}
          arrearsCount={data.arrearsCount}
          pendingCount={data.pendingCount}
          pendingUploadsToday={data.pendingUploadsToday}
          pendingCategory={data.pendingCategory}
        />
      </div>

      {/* 4. Bottom Section: Analysis Progress Bars */}
      <LamanUtamaAnalysis items={data.analysis} />
    </div>
  );
}