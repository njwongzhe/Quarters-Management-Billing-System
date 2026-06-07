"use client";

import { useEffect, useState, useRef } from "react";
import Icon from "@/app/components/Icon/Icon";

interface ArrearsClassItem {
  className: string;
  amount: string;
  settlementRate: number; 
  opacity: number;       
}

interface LamanUtamaAnalysisProps {
  items?: ArrearsClassItem[];
  isLoading?: boolean;
}

export default function LamanUtamaAnalysis({
  items = [],
  isLoading = false,
}: LamanUtamaAnalysisProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverRegion, setHoverRegion] = useState<'left' | 'right' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollLockRef = useRef<number | null>(null);

  const itemsPerPage = 5;
  const effectiveItems = isLoading
    ? [
        { className: "Kelas Loading...", amount: "Loading...", settlementRate: 0, opacity: 0.35 },
        { className: "Kelas Loading...", amount: "Loading...", settlementRate: 0, opacity: 0.35 },
        { className: "Kelas Loading...", amount: "Loading...", settlementRate: 0, opacity: 0.35 },
      ]
    : items;
  const totalPages = Math.ceil(effectiveItems.length / itemsPerPage);

  useEffect(() => {
    if (isHovered || totalPages <= 1) return;

    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 4000); 

    return () => clearInterval(timer);
  }, [isHovered, totalPages]);

  useEffect(() => {
    setCurrentPage(0);
  }, [effectiveItems.length]);

  const displayedItems = effectiveItems.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  let minHeight = 580;
  if (effectiveItems.length === 0) {
    minHeight = 280; 
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
      minHeight = 580; 
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!e.shiftKey || totalPages <= 1 || scrollLockRef.current) return;

    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;

    if (delta > 0) {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    } else if (delta < 0) {
      setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
    }

    scrollLockRef.current = window.setTimeout(() => {
      scrollLockRef.current = null;
    }, 600);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || totalPages <= 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverRegion(x < rect.width / 2 ? 'left' : 'right');
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverRegion(null);
  };

  const handleLeftClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (totalPages <= 1) return;
    if (hoverRegion === 'left') {
      handleLeftClick(e);
    } else if (hoverRegion === 'right') {
      handleRightClick(e);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onClick={handleContainerClick}
      className={`flex flex-col items-stretch w-full bg-light-blue rounded-xl shadow-sm hover:shadow-md hover:scale-[1.01] select-none transition-all duration-500 ease-in-out overflow-hidden ${
        hoverRegion ? "cursor-pointer" : ""
      }`}
    >
      <div className="px-8 pt-8 pb-6 flex flex-row justify-between items-center w-full">
        <h4 className="text-lg font-bold text-[#0B1C30]">
          Analisis Tunggakan Mengikut Kelas
        </h4>
        
        {totalPages > 1 && (
          <span className="text-xs font-semibold text-dark-blue bg-white/60 px-2.5 py-1 rounded-md border border-slate-200">
            Halaman {currentPage + 1} Daripada {totalPages}
          </span>
        )}
      </div>

      <div className="flex flex-row">
        {/* Left Arrow */}
        {totalPages > 1 && (
          <div
            className={`flex-shrink-0 flex items-center justify-start transition-colors duration-500 z-10 ${
              hoverRegion === 'left' ? "bg-gradient-to-r from-dark-blue/5 to-transparent" : "pointer-events-none"
            }`}
            title="Halaman Sebelumnya"
          >
            <div className={`transition-all duration-700 ease-out transform text-dark-blue ${
              hoverRegion === 'left' ? "opacity-30 translate-x-0" : "opacity-0 -translate-x-2"
            }`}>
              <Icon icon="chevronLeft" size={32} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 flex flex-col relative z-0 overflow-hidden ${totalPages > 1 ? "" : "px-8"}`}>
          <div className="relative w-full flex-grow overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col gap-6 w-full pt-2 pb-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 w-full">
                    <div className="flex flex-row justify-between items-center w-full">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-1/5 animate-pulse rounded bg-slate-200" />
                    </div>
                    <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-full animate-pulse bg-slate-200" />
                    </div>
                    <div className="h-3 w-1/5 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : effectiveItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 w-full text-grey/60">
                <span className="text-sm font-semibold">
                  Tiada rekod tunggakan ditemui.
                </span>
              </div>
            ) : (
              <div
                className="flex flex-row items-start w-full transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentPage * 100}%)`,
                }}
              >
                {/* ... existing rendering logic ... */}
                {Array.from({ length: totalPages }).map((_, pageIdx) => {
                  const pageItems = effectiveItems.slice(
                    pageIdx * itemsPerPage,
                    (pageIdx + 1) * itemsPerPage
                  );

                  return (
                    <div
                      key={pageIdx}
                      className="w-full flex-shrink-0 flex flex-col gap-6"
                    >
                      {pageItems.map((item, index) => {
                        const outstandingRate = item.amount === "Loading..." || item.amount.includes(" 0.00") ? 0 : (100 - item.settlementRate);

                        return (
                          <div key={index} className="flex flex-col gap-2 w-full">
                            <div className="flex flex-row justify-between items-center w-full">
                              <span className="text-sm font-bold text-[#0B1C30]">
                                {item.className}
                              </span>
                              <span className="text-base font-bold text-red">
                                {item.amount}
                              </span>
                            </div>

                            <div className="relative w-full h-3.5 bg-white rounded-full overflow-hidden">
                              <div
                                className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: `${outstandingRate}%`,
                                  backgroundColor: `rgba(186, 26, 26, ${item.opacity})`,
                                }}
                              />
                            </div>

                            <div className="w-full text-[11px] text-grey font-medium leading-3">
                              Kadar Penyelesaian: {item.amount === "Loading..." ? "Loading..." : `${item.settlementRate}%`}
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
        </div>

        {/* Right Arrow */}
        {totalPages > 1 && (
          <div
            className={`flex-shrink-0 flex items-center justify-end transition-colors duration-500 z-10 ${
              hoverRegion === 'right' ? "bg-gradient-to-l from-dark-blue/5 to-transparent" : "pointer-events-none"
            }`}
            title="Halaman Seterusnya"
          >
            <div className={`transition-all duration-700 ease-out transform text-dark-blue ${
              hoverRegion === 'right' ? "opacity-30 translate-x-0" : "opacity-0 translate-x-2"
            }`}>
              <Icon icon="chevronRight" size={32} />
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-8 pt-4 pb-8 flex flex-row items-center justify-end gap-1.5 z-20 pointer-events-none">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation(); 
                setCurrentPage(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer pointer-events-auto ${
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