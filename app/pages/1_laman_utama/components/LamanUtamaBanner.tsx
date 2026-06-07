"use client";

import { useEffect, useState, useRef } from "react";
import Icon from "@/app/components/Icon/Icon";

interface LamanUtamaBannerProps {
  isLoading?: boolean;
  monthlyAmount?: string;
  monthlyChange?: string;
  monthlyPercentage?: number;
  totalAmount?: string;
  totalChange?: string;
  totalPercentage?: number;
}

export default function LamanUtamaBanner({
  isLoading = false,
  monthlyAmount = "RM 0.00",
  monthlyChange = "+0.0%",
  monthlyPercentage = 0,
  totalAmount = "RM 0.00",
  totalChange = "+0.0% YTD",
  totalPercentage = 0,
}: LamanUtamaBannerProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollLockRef = useRef<number | null>(null);

  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 2);
    }, 4000);

    return () => clearInterval(timer);
  }, [isHovered]);

  const slides = [
    {
      subtitle: "Jumlah Kutipan (Bulan Ini)",
      amount: isLoading ? "Loading..." : monthlyAmount,
      badge: isLoading ? "Loading..." : `${monthlyChange} vs Bulan Lepas`,
      percentage: isLoading ? 0 : monthlyPercentage,
      targetLabel: isLoading ? "SASARAN BULANAN: Loading..." : `SASARAN BULANAN: ${monthlyPercentage}%`,
    },
    {
      subtitle: "Jumlah Keseluruhan Kutipan",
      amount: isLoading ? "Loading..." : totalAmount,
      badge: isLoading ? "Loading..." : totalChange,
      percentage: isLoading ? 0 : totalPercentage,
      targetLabel: isLoading ? "SASARAN TAHUNAN: Loading..." : `SASARAN TAHUNAN: ${totalPercentage}%`,
    },
  ];

  // Handle mouse wheel scrolling for slide transition - Updated with Shift key requirement
  const handleWheel = (e: React.WheelEvent) => {
    if (!e.shiftKey || slides.length <= 1 || scrollLockRef.current) return;

    const delta = e.deltaY;

    if (delta > 0) {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    } else if (delta < 0) {
      setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }

    scrollLockRef.current = window.setTimeout(() => {
      scrollLockRef.current = null;
    }, 600);
  };

  const handleContainerClick = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel}
      onClick={handleContainerClick}
      className="relative w-full h-[223px] overflow-hidden bg-gradient-to-r from-[#151E66] to-[#2D367D] rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.01] text-white select-none transition-all duration-300 cursor-pointer"
    >
      <div className="absolute inset-0 bg-white/[0.002] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] rounded-xl pointer-events-none" />

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
            <div className="flex flex-row justify-between items-center w-full">
              <div className="flex items-center justify-center w-12 h-10 bg-white/20 rounded-xl">
                <Icon icon="payments" size={22} className="text-white" />
              </div>
              <div className="flex items-center px-3 py-1 bg-white/20 rounded-full">
                <span className="text-xs font-bold leading-4 text-white">
                  {slide.badge}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-4">
              <span className="text-sm font-medium text-white/70">
                {slide.subtitle}
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold leading-10 text-white tracking-tight">
                {slide.amount}
              </h3>
            </div>

            <div className="flex flex-row items-center gap-4 w-full mt-4 pr-16">
              <div className="relative flex-grow h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#FEC652] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${slide.percentage}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-white/90 tracking-wider whitespace-nowrap">
                {slide.targetLabel}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 right-8 flex flex-row items-center gap-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveSlide(0);
          }}
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
            activeSlide === 0 ? "bg-white w-4" : "bg-white/40 hover:bg-white/70 w-1.5"
          }`}
          aria-label="Tunjukkan Jumlah Kutipan Bulan Ini"
          title="Bulan Ini"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveSlide(1);
          }}
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