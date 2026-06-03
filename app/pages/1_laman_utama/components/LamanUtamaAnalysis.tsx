"use client";

import { useEffect, useState } from "react";

interface ArrearsClassItem {
  className: string;
  amount: string;
  settlementRate: number; // e.g. 15 for 15%
  opacity: number;       // e.g. 1 for 100%, 0.7 for 70%, 0.4 for 40%
}

interface LamanUtamaAnalysisProps {
  items?: ArrearsClassItem[];
}

export default function LamanUtamaAnalysis({
  items = [],
}: LamanUtamaAnalysisProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(items.length / itemsPerPage);

  useEffect(() => {
    if (isHovered || totalPages <= 1) return;

    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000); // toggle every 5 seconds

    return () => clearInterval(timer);
  }, [isHovered, totalPages]);

  // Reset to first page if items length changes
  useEffect(() => {
    setCurrentPage(0);
  }, [items.length]);

  const displayedItems = items.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex flex-col items-start p-8 w-full min-h-[580px] bg-light-blue rounded-xl shadow-sm hover:shadow-md hover:scale-[1.01] select-none transition-all duration-300"
    >
      {/* Title & Page Indicators */}
      <div className="flex flex-row justify-between items-center w-full mb-6">
        <h4 className="text-lg font-bold text-[#0B1C30]">
          Analisis Tunggakan Mengikut Kelas
        </h4>
        
        {/* Page indicator text */}
        {totalPages > 1 && (
          <span className="text-xs font-semibold text-dark-blue bg-white/60 px-2.5 py-1 rounded-md border border-slate-200">
            Halaman {currentPage + 1} daripada {totalPages}
          </span>
        )}
      </div>

      {/* List Container */}
      <div className="flex flex-col gap-6 w-full flex-grow">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 w-full text-grey/60">
            <span className="text-sm font-semibold">
              Tiada rekod tunggakan ditemui
            </span>
          </div>
        ) : (
          displayedItems.map((item, index) => {
            // Progress bar represents outstanding arrears = 100% - settlementRate
            const outstandingRate = 100 - item.settlementRate;

            // Key includes currentPage to force rerender and trigger fade-in animation on page switch
            return (
              <div key={`${currentPage}-${index}`} className="flex flex-col gap-2 w-full animate-fadeIn">
                {/* Top row: Class Name and Amount */}
                <div className="flex flex-row justify-between items-center w-full">
                  <span className="text-sm font-bold text-[#0B1C30]">
                    {item.className}
                  </span>
                  <span className="text-base font-bold text-red">
                    {item.amount}
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="relative w-full h-3.5 bg-white rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${outstandingRate}%`,
                      backgroundColor: `rgba(186, 26, 26, ${item.opacity})`,
                    }}
                  />
                </div>

                {/* Label row */}
                <div className="w-full text-[11px] text-grey font-medium leading-3">
                  Kadar Penyelesaian: {item.settlementRate}%
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Dots (Bottom Right) */}
      {totalPages > 1 && (
        <div className="absolute bottom-6 right-8 flex flex-row items-center gap-1.5 z-20">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentPage === idx
                  ? "bg-dark-blue w-4"
                  : "bg-dark-blue/20 hover:bg-dark-blue/50 w-1.5"
              }`}
              aria-label={`Tunjukkan Halaman ${idx + 1}`}
              title={`Halaman ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
