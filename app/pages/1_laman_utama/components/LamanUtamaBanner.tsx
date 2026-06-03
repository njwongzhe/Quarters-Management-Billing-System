"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/Icon/Icon";

interface LamanUtamaBannerProps {
  monthlyAmount?: string;
  monthlyChange?: string;
  monthlyPercentage?: number;
  totalAmount?: string;
  totalChange?: string;
  totalPercentage?: number;
}

export default function LamanUtamaBanner({
  monthlyAmount = "RM 0.00",
  monthlyChange = "+0.0%",
  monthlyPercentage = 0,
  totalAmount = "RM 0.00",
  totalChange = "+0.0% YTD",
  totalPercentage = 0,
}: LamanUtamaBannerProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 2);
    }, 4000); // toggle every 5 seconds

    return () => clearInterval(timer);
  }, [isHovered]);

  const slides = [
    {
      subtitle: "Jumlah Kutipan (Bulan Ini)",
      amount: monthlyAmount,
      badge: `${monthlyChange} vs Bulan Lepas`,
      percentage: monthlyPercentage,
      targetLabel: `SASARAN BULANAN: ${monthlyPercentage}%`,
    },
    {
      subtitle: "Jumlah Keseluruhan Kutipan",
      amount: totalAmount,
      badge: totalChange,
      percentage: totalPercentage,
      targetLabel: `SASARAN TAHUNAN: ${totalPercentage}%`,
    },
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[223px] overflow-hidden bg-gradient-to-r from-[#151E66] to-[#2D367D] rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.01] text-white select-none transition-all duration-300"
    >
      {/* Background shadow overlay */}
      <div className="absolute inset-0 bg-white/[0.002] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] rounded-xl pointer-events-none" />

      {/* Slide Container (Flex row for horizontal sliding) */}
      <div
        className="flex flex-row w-full h-full transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${activeSlide * 100}%)`,
        }}
      >
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className="w-full h-full p-8 flex flex-col justify-between flex-shrink-0"
          >
            {/* Top row */}
            <div className="flex flex-row justify-between items-center w-full">
              {/* Payments Icon Container */}
              <div className="flex items-center justify-center w-12 h-10 bg-white/20 rounded-xl">
                <Icon icon="payments" size={22} className="text-white" />
              </div>

              {/* Comparison Badge */}
              <div className="flex items-center px-3 py-1 bg-white/20 rounded-full">
                <span className="text-xs font-bold leading-4 text-white">
                  {slide.badge}
                </span>
              </div>
            </div>

            {/* Middle row: Label and value */}
            <div className="flex flex-col gap-1 mt-4">
              <span className="text-sm font-medium text-white/70">
                {slide.subtitle}
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold leading-10 text-white tracking-tight">
                {slide.amount}
              </h3>
            </div>

            {/* Bottom row: Progress bar and target */}
            <div className="flex flex-row items-center gap-4 w-full mt-4 pr-16">
              {/* Progress track */}
              <div className="relative flex-grow h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#FEC652] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${slide.percentage}%` }}
                />
              </div>

              {/* Target Text */}
              <span className="text-[10px] font-bold text-white/90 tracking-wider whitespace-nowrap">
                {slide.targetLabel}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots (Bottom Right) */}
      <div className="absolute bottom-6 right-8 flex flex-row items-center gap-2 z-20">
        <button
          onClick={() => setActiveSlide(0)}
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
            activeSlide === 0 ? "bg-white w-4" : "bg-white/40 hover:bg-white/70 w-1.5"
          }`}
          aria-label="Tunjukkan Jumlah Kutipan Bulan Ini"
          title="Bulan Ini"
        />
        <button
          onClick={() => setActiveSlide(1)}
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
            activeSlide === 1 ? "bg-white w-4" : "bg-white/40 hover:bg-white/70 w-1.5"
          }`}
          aria-label="Tunjukkan Jumlah Keseluruhan Kutipan"
          title="Keseluruhan"
        />
      </div>
    </div>
  );
}
