"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/Icon/Icon";

interface LamanUtamaOccupancyGaugeProps {
  initialTotal?: number;
  initialOccupied?: number;
}

export default function LamanUtamaOccupancyGauge({
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

  const occupancyPercent = Math.round(occupancyRate * 100);
  const vacancyPercent = Math.round(vacancyRate * 100);

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

  return (
    <div className="relative flex flex-col items-start p-8 w-full h-[332px] bg-light-blue rounded-xl select-none">
      {/* Header section */}
      <div className="flex flex-row justify-between items-center w-full mb-6">
        <div className="flex flex-row items-center gap-2">
          <Icon icon="apartment" size={18} className="text-dark-blue" />
          <h4 className="text-lg font-bold text-[#0B1C30]">
            Status Penghunian Kuarters
          </h4>
        </div>
      </div>

      {/* Centered Gauge Area */}
      <div className="flex justify-center items-center w-full flex-grow">
        {/* Outer 320x192 box container */}
        <div className="relative w-[320px] h-[192px] rounded-lg bg-light-blue overflow-visible">
          
          {/* Base Background Border (Light Blue) */}
          <div className="absolute inset-0 border-[12px] border-[#D3E4FE] rounded-lg pointer-events-none" />

          {/* Dynamic Foreground Running Border (SVG Overlay) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 320 192"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={pathD}
              stroke="#151E66"
              strokeWidth="12"
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
                {formatNumber(total)}
              </span>
            </div>

            {/* Divider */}
            <div className="w-[148px] border-t border-[#E2E8F0] my-2" />

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
                <span className="text-sm font-black text-[#0B1C30] mt-0.5">
                  {formatNumber(occupied)}
                </span>
                <span className="text-[9px] font-bold text-dark-blue mt-0.5">
                  {occupancyPercent}%
                </span>
              </div>

              {/* Vertical separator */}
              <div className="h-10 w-px bg-[#E2E8F0]" />

              {/* Column 2: Kosong */}
              <div className="flex flex-col items-center">
                <div className="flex flex-row items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#D3E4FE] rounded-full" />
                  <span className="text-[9px] font-bold text-grey uppercase tracking-wider">
                    Kosong
                  </span>
                </div>
                <span className="text-sm font-black text-[#0B1C30] mt-0.5">
                  {formatNumber(vacant)}
                </span>
                <span className="text-[9px] font-bold text-grey mt-0.5">
                  {vacancyPercent}%
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
