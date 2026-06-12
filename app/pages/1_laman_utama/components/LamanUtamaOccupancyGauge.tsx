"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/Icon/Icon";

interface LamanUtamaOccupancyGaugeProps {
  isLoading?: boolean;
  initialTotal?: number;
  initialOccupied?: number;
}

export default function LamanUtamaOccupancyGauge({
  isLoading = false,
  initialTotal = 0,
  initialOccupied = 0,
}: LamanUtamaOccupancyGaugeProps) {
  const [total, setTotal] = useState(initialTotal);
  const [occupied, setOccupied] = useState(initialOccupied);

  useEffect(() => {
    setTotal(initialTotal);
    setOccupied(initialOccupied);
  }, [initialTotal, initialOccupied]);

  // Derive vacancy and percentages
  const vacant = Math.max(0, total - occupied);
  const occupancyRate = total > 0 ? occupied / total : 0;
  const vacancyRate = total > 0 ? vacant / total : 0;

  const occupancyPercent = Math.round(occupancyRate * 100).toFixed(2);
  const vacancyPercent = Math.round(vacancyRate * 100).toFixed(2);

  // SVG Path settings
  // The path starts at the top middle: (160, 6)
  // And goes clockwise along a 320x192 rectangle inset by 6px (half of 12px stroke-width)
  // x-bounds: 6 to 314 (width 320)
  // y-bounds: 6 to 186 (height 192)
  // Corner radius r = 4
  const pathD = "M 160 6 L 310 6 A 4 4 0 0 1 314 10 L 314 182 A 4 4 0 0 1 310 186 L 10 186 A 4 4 0 0 1 6 182 L 6 10 A 4 4 0 0 1 10 6 L 160 6 Z";
  
  // Perimeter of the inset path:
  // w = 308, h = 180, r = 4
  // Perimeter = 2 * (308 + 180) - 8 * r + 2 * Math.PI * r = 969.13px
  const perimeter = 969.13;
  const strokeOffset = perimeter * (1 - occupancyRate);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ms-MY").format(num);
  };

  const totalDisplay = isLoading ? "Loading..." : formatNumber(total);
  const occupiedDisplay = isLoading ? "---" : formatNumber(occupied);
  const vacantDisplay = isLoading ? "---" : formatNumber(vacant);
  const occupancyPercentDisplay = isLoading ? "--%" : `${occupancyPercent}%`;
  const vacancyPercentDisplay = isLoading ? "--%" : `${vacancyPercent}%`;

  return (
    <div className="relative flex flex-col items-start p-6 w-full h-83 bg-light-blue rounded-xl select-none">
      {/* Header section */}
      <div className="flex flex-row justify-between items-center w-full mb-2">
        <div className="flex flex-row items-center gap-2">
          <Icon icon="apartment" size={18} className="text-dark-blue" />
          <h4 className="text-lg font-bold text-content">
            Status Penghunian Kuarters
          </h4>
        </div>
      </div>

      {/* Centered Gauge Area */}
      <div className="flex justify-center items-center w-full grow">
        {/* Outer 320x192 box container */}
        <div className="relative w-[320px] h-48 rounded-lg bg-light-blue overflow-visible">
          
          {/* Base Background Border (Light Blue) */}
          <div className="absolute inset-0 border-16 border-gauge-primary rounded-lg pointer-events-none" />

          {/* Dynamic Foreground Running Border (SVG Overlay) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 320 192"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={pathD}
              stroke="var(--color-brand-accent)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={perimeter}
              strokeDashoffset={strokeOffset}
              style={{
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </svg>

          {/* Inner Stats Card content */}
          <div className="absolute inset-3 bg-light-blue rounded-md flex flex-col justify-center items-center py-4 px-6 z-10">
            {/* Total Stats */}
            <div className="flex flex-col items-center justify-center h-16">
              <span className="text-[10px] font-extrabold tracking-widest text-dark-blue uppercase">
                Jumlah
              </span>
              <span className="text-[30px] font-black leading-9 text-dark-blue mt-0.5">
                {totalDisplay}
              </span>
            </div>

            {/* Divider */}
            <div className="w-37 border-t border-gauge-secondary my-2" />

            {/* Split Dihuni vs Kosong columns */}
            <div className="flex flex-row justify-center items-center gap-6 w-full mt-1">
              {/* Column 1: Dihuni */}
              <div className="flex flex-col items-center">
                <div className="flex flex-row items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-dark-blue rounded-full" />
                  <span className="text-[9px] font-bold text-grey uppercase tracking-wider">
                    Dihuni
                  </span>
                </div>
                <span className="text-lg font-black text-content mt-0.5">
                  {occupiedDisplay}
                </span>
                <span className="text-[12px] font-bold text-dark-blue mt-0.5">
                  {occupancyPercentDisplay}
                </span>
              </div>

              {/* Vertical separator */}
              <div className="h-10 w-px bg-gauge-secondary" />

              {/* Column 2: Kosong */}
              <div className="flex flex-col items-center">
                <div className="flex flex-row items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gauge-primary rounded-full" />
                  <span className="text-[9px] font-bold text-grey uppercase tracking-wider">
                    Kosong
                  </span>
                </div>
                <span className="text-lg font-black text-content mt-0.5">
                  {vacantDisplay}
                </span>
                <span className="text-[12px] font-bold text-grey mt-0.5">
                  {vacancyPercentDisplay}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
