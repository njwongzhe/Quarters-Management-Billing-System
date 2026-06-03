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
    }, 4000); // toggle every 5 seconds

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

  // Compute dynamic height based on the number of items displayed on the current page.
  // This ensures the card fits the items beautifully for 1-4 items instead of leaving huge empty space,
  // transitioning height smoothly between page changes.
  let minHeight = 580;
  if (items.length === 0) {
    minHeight = 280; // Empty state height
  } else {
    const count = displayedItems.length;
    const hasPagination = totalPages > 1;

    if (count === 1) {
      minHeight = hasPagination ? 240 : 200;
    } else if (count === 2) {
      minHeight = hasPagination ? 330 : 290;
    } else if (count === 3) {
      minHeight = hasPagination ? 420 : 380;
    } else if (count === 4) {
      minHeight = hasPagination ? 510 : 470;
    } else {
      minHeight = 580; // 5 items
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ minHeight: `${minHeight}px` }}
      className="relative flex flex-col items-start p-8 w-full bg-light-blue rounded-xl shadow-sm hover:shadow-md hover:scale-[1.01] select-none transition-all duration-500 ease-in-out"
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
      <div className="relative w-full flex-grow overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 w-full text-grey/60">
            <span className="text-sm font-semibold">
              Tiada rekod tunggakan ditemui
            </span>
          </div>
        ) : (
          <div
            className="flex flex-row items-start w-full transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${currentPage * 100}%)`,
            }}
          >
            {Array.from({ length: totalPages }).map((_, pageIdx) => {
              const pageItems = items.slice(
                pageIdx * itemsPerPage,
                (pageIdx + 1) * itemsPerPage
              );

              return (
                <div
                  key={pageIdx}
                  className="w-full flex-shrink-0 flex flex-col gap-6"
                >
                  {pageItems.map((item, index) => {
                    // Progress bar represents outstanding arrears = 100% - settlementRate
                    // If the outstanding amount is 0, the progress bar width is 0%
                    const outstandingRate = item.amount.includes(" 0.00") ? 0 : (100 - item.settlementRate);

                    return (
                      <div key={index} className="flex flex-col gap-2 w-full">
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
                  })}
                </div>
              );
            })}
          </div>
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
