"use client";

import { useMemo, useRef, useState } from "react";
import Icon from "@/app/components/Icon/Icon";
import Calender from "@/app/components/Calender/Calender";

type ArrearsFilterMonthProps = {
  value: string;
  onChange: (month: string) => void;
};

export default function ArrearsFilterMonth({ value, onChange }: ArrearsFilterMonthProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const label = useMemo(() => {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) {
      return "Pilih Bulan";
    }

    return new Intl.DateTimeFormat("ms-MY", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }, [value]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-light-grey/20 bg-white px-3 text-sm text-grey transition-colors hover:border-dark-blue hover:text-dark-blue"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Pilih bulan caj"
      >
        <Icon icon="calendar_month" size={18} className="text-dark-blue" />
        <span className="font-semibold text-dark-blue">{label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-max">
          <Calender
            containerRef={containerRef}
            isOpen={isOpen}
            value={`${value}-01`}
            monthOnly={true}
            disableAbsolutePositioning={true} 
            onChange={(nextDate) => {
              onChange(nextDate.slice(0, 7));
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}