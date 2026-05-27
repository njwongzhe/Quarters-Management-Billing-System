"use client";

import Icon from "@/app/components/Icon/Icon";

interface LamanUtamaBannerProps {
  amount: string;
  percentageChange: string;
  targetPercentage: number;
  currentPercentage: number;
}

export default function LamanUtamaBanner({
  amount = "RM 452,890.00",
  percentageChange = "+4.5%",
  targetPercentage = 80,
  currentPercentage = 75,
}: LamanUtamaBannerProps) {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#151E66] to-[#2D367D] rounded-xl p-8 shadow-xl text-white">
      {/* Background shadow overlay */}
      <div className="absolute inset-0 bg-white/[0.002] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] rounded-xl pointer-events-none" />

      {/* Top row */}
      <div className="flex flex-row justify-between items-center w-full mb-6">
        {/* Payments Icon Container */}
        <div className="flex items-center justify-center w-12 h-10 bg-white/20 rounded-xl">
          <Icon icon="payments" size={22} className="text-white" />
        </div>

        {/* Comparison Badge */}
        <div className="flex items-center px-3 py-1 bg-white/20 rounded-full">
          <span className="text-xs font-bold leading-4 text-white">
            {percentageChange} vs Bulan Lepas
          </span>
        </div>
      </div>

      {/* Middle row: Label and value */}
      <div className="flex flex-col gap-1 mb-6">
        <span className="text-sm font-medium text-white/70">
          Jumlah Kutipan (Bulan Ini)
        </span>
        <h3 className="text-3xl sm:text-4xl font-extrabold leading-10 text-white tracking-tight">
          {amount}
        </h3>
      </div>

      {/* Bottom row: Progress bar and target */}
      <div className="flex flex-row items-center gap-4 w-full mt-4">
        {/* Progress track */}
        <div className="relative flex-grow h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#FEC652] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${currentPercentage}%` }}
          />
        </div>

        {/* Target Text */}
        <span className="text-[10px] font-bold text-white tracking-wider whitespace-nowrap">
          SASARAN: {targetPercentage}%
        </span>
      </div>
    </div>
  );
}
