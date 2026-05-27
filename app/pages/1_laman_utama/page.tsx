"use client";

import { useState } from "react";
import LamanUtamaHeader from "./components/LamanUtamaHeader";
import LamanUtamaBanner from "./components/LamanUtamaBanner";
import LamanUtamaOccupancyGauge from "./components/LamanUtamaOccupancyGauge";
import LamanUtamaAlerts from "./components/LamanUtamaAlerts";
import LamanUtamaAnalysis from "./components/LamanUtamaAnalysis";

interface MonthlyMockData {
  amount: string;
  percentageChange: string;
  currentPercentage: number;
  occupancyTotal: number;
  occupancyOccupied: number;
  arrearsAmount: string;
  arrearsCount: number;
  pendingCount: number;
  pendingUploadsToday: number;
  analysis: Array<{
    className: string;
    amount: string;
    settlementRate: number;
    opacity: number;
  }>;
}

// Structuring dynamic mock data per month for interactive demonstration
const MONTHLY_MOCK_DATA: Record<string, MonthlyMockData> = {
  "Julai 2024": {
    amount: "RM 452,890.00",
    percentageChange: "+4.5%",
    currentPercentage: 75,
    occupancyTotal: 1450,
    occupancyOccupied: 1087,
    arrearsAmount: "RM 24,150.00",
    arrearsCount: 128,
    pendingCount: 42,
    pendingUploadsToday: 3,
    analysis: [
      { className: "Jalan Ariffin", amount: "RM 8,450.00", settlementRate: 15, opacity: 1.0 },
      { className: "Taman Nusantara", amount: "RM 5,200.00", settlementRate: 40, opacity: 0.7 },
      { className: "Persiaran Tanjung", amount: "RM 3,100.00", settlementRate: 65, opacity: 0.4 },
    ],
  },
  "Jun 2024": {
    amount: "RM 412,350.00",
    percentageChange: "+3.2%",
    currentPercentage: 68,
    occupancyTotal: 1450,
    occupancyOccupied: 1050,
    arrearsAmount: "RM 28,900.00",
    arrearsCount: 135,
    pendingCount: 29,
    pendingUploadsToday: 1,
    analysis: [
      { className: "Jalan Ariffin", amount: "RM 10,200.00", settlementRate: 10, opacity: 1.0 },
      { className: "Taman Nusantara", amount: "RM 6,100.00", settlementRate: 35, opacity: 0.7 },
      { className: "Persiaran Tanjung", amount: "RM 3,400.00", settlementRate: 60, opacity: 0.4 },
    ],
  },
  "Mei 2024": {
    amount: "RM 395,120.00",
    percentageChange: "-1.8%",
    currentPercentage: 65,
    occupancyTotal: 1450,
    occupancyOccupied: 1025,
    arrearsAmount: "RM 31,450.00",
    arrearsCount: 142,
    pendingCount: 56,
    pendingUploadsToday: 5,
    analysis: [
      { className: "Jalan Ariffin", amount: "RM 11,800.00", settlementRate: 8, opacity: 1.0 },
      { className: "Taman Nusantara", amount: "RM 7,300.00", settlementRate: 30, opacity: 0.7 },
      { className: "Persiaran Tanjung", amount: "RM 4,200.00", settlementRate: 55, opacity: 0.4 },
    ],
  },
};

// Fallback data generator for other months
const getMockDataForMonth = (month: string): MonthlyMockData => {
  if (MONTHLY_MOCK_DATA[month]) {
    return MONTHLY_MOCK_DATA[month];
  }
  // Generate slightly randomized but consistent values for demonstration
  const monthHash = month.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const occupancyOccupied = 1000 + (monthHash % 150);
  const currentPercentage = 60 + (monthHash % 25);
  const collectionAmount = 350000 + (monthHash % 15) * 8000;
  
  return {
    amount: `RM ${collectionAmount.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`,
    percentageChange: (monthHash % 2 === 0 ? "+" : "-") + ((monthHash % 8) + 1.2).toFixed(1) + "%",
    currentPercentage,
    occupancyTotal: 1450,
    occupancyOccupied,
    arrearsAmount: `RM ${(20000 + (monthHash % 10) * 1200).toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`,
    arrearsCount: 110 + (monthHash % 40),
    pendingCount: 20 + (monthHash % 30),
    pendingUploadsToday: monthHash % 5,
    analysis: [
      { className: "Jalan Ariffin", amount: `RM ${(8000 + (monthHash % 5) * 400).toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`, settlementRate: 10 + (monthHash % 15), opacity: 1.0 },
      { className: "Taman Nusantara", amount: `RM ${(5000 + (monthHash % 5) * 300).toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`, settlementRate: 30 + (monthHash % 20), opacity: 0.7 },
      { className: "Persiaran Tanjung", amount: `RM ${(3000 + (monthHash % 5) * 200).toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`, settlementRate: 50 + (monthHash % 20), opacity: 0.4 },
    ],
  };
};

export default function LamanUtamaPage() {
  const [selectedMonth, setSelectedMonth] = useState("Julai 2024");
  const data = getMockDataForMonth(selectedMonth);

  return (
    <div className="flex flex-col gap-8 w-full pb-20 relative">
      {/* 1. Header Section */}
      <LamanUtamaHeader
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* 2. Top Row Metric Card (Banner) */}
      <LamanUtamaBanner
        amount={data.amount}
        percentageChange={data.percentageChange}
        targetPercentage={80}
        currentPercentage={data.currentPercentage}
      />

      {/* 3. Middle Grid: Occupancy Gauge (Left) & Alerts (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
        {/* Occupancy Card (Left) */}
        <LamanUtamaOccupancyGauge
          initialTotal={data.occupancyTotal}
          initialOccupied={data.occupancyOccupied}
          key={`${selectedMonth}-${data.occupancyOccupied}`} // Remount component on month change to restart animations cleanly
        />

        {/* Warning & Alerts Card (Right) */}
        <LamanUtamaAlerts
          arrearsAmount={data.arrearsAmount}
          arrearsCount={data.arrearsCount}
          pendingCount={data.pendingCount}
          pendingUploadsToday={data.pendingUploadsToday}
        />
      </div>

      {/* 4. Bottom Section: Analysis Progress Bars */}
      <LamanUtamaAnalysis items={data.analysis} />
    </div>
  );
}