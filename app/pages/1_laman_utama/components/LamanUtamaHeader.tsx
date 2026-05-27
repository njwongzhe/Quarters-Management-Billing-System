"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "@/app/components/Icon/Icon";

interface LamanUtamaHeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

const MONTHS = [
  "Januari 2024",
  "Februari 2024",
  "Mac 2024",
  "April 2024",
  "Mei 2024",
  "Jun 2024",
  "Julai 2024",
  "Ogos 2024",
  "September 2024",
  "Oktober 2024",
  "November 2024",
  "Disember 2024",
];

export default function LamanUtamaHeader({
  selectedMonth,
  onMonthChange,
}: LamanUtamaHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
      <div className="flex flex-col">
        <h2 className="text-[30px] font-extrabold leading-9 tracking-tight text-[#0B1C30]">
          Ringkasan Eksekutif
        </h2>
        <p className="text-base text-grey leading-6 mt-1">
          Paparan statistik terkini bagi pengurusan kuarters Johor.
        </p>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-row items-center gap-2 px-4 py-2 bg-light-blue rounded-xl text-dark-blue font-semibold text-sm transition-all hover:opacity-90 hover:scale-[0.98] active:scale-[0.96] cursor-pointer"
        >
          <Icon icon="calendar" size={18} className="text-dark-blue" />
          <span>{selectedMonth}</span>
          <Icon icon="chevronDown" size={14} className="text-dark-blue ml-1" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-light-blue rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
            {MONTHS.map((month) => (
              <button
                key={month}
                onClick={() => {
                  onMonthChange(month);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-light-blue ${
                  selectedMonth === month
                    ? "font-bold text-dark-blue bg-light-blue/50"
                    : "text-grey font-medium"
                }`}
              >
                {month}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
