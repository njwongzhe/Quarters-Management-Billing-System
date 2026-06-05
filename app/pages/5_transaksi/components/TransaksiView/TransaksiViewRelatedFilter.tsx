"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { createPortal } from "react-dom";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import FilterDate from "@/app/components/Filter/FilterDate";
import { commonIcons } from "@/app/components/Icon/Icon";

type DateFilter = { startDate: string; endDate: string };

type RelatedRecord = {
  id: string;
  transactionNo?: string | null;
  transactionDate: string | Date;
  status: string;
  description?: string | null;
  debitAmount: number | string;
  creditAmount: number | string;
};

type UseTransaksiViewRelatedFilterResult = {
  filteredRecords: RelatedRecord[];
  isDateFilterActive: boolean;
  FilterButton: React.ReactNode;
};

export function useTransaksiViewRelatedFilter(
  records: RelatedRecord[],
): UseTransaksiViewRelatedFilterResult {
  const [dateFilter, setDateFilter] = useState<DateFilter>({ startDate: "", endDate: "" });
  const [isOpen, setIsOpen] = useState(false);
  const [anchorStyle, setAnchorStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !target?.closest("[data-filter-date-panel]")
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleToggle() {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setAnchorStyle({
        position: "fixed",
        top: rect.bottom,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }
    setIsOpen((prev) => !prev);
  }

  const isActive = Boolean(dateFilter.startDate || dateFilter.endDate);

  const filteredRecords = isActive
    ? records.filter((record) => {
        // Convert date string/object to YYYY-MM-DD
        const d = new Date(record.transactionDate);
        if (isNaN(d.getTime())) return true;
        const formattedDate = d.toISOString().split("T")[0];

        if (dateFilter.startDate && formattedDate < dateFilter.startDate) return false;
        if (dateFilter.endDate && formattedDate > dateFilter.endDate) return false;
        return true;
      })
    : records;

  const panel =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div style={anchorStyle} data-filter-date-panel>
            <FilterDate
              title="Tapis Tarikh"
              description="Pilihan tarikh akan ditapis secara automatik"
              ariaLabel="Tapis transaksi berkaitan mengikut tarikh"
              value={dateFilter}
              onApply={(value) => {
                setDateFilter(value);
                setIsOpen(false);
              }}
              onClear={() => {
                setDateFilter({ startDate: "", endDate: "" });
                setIsOpen(false);
              }}
            />
          </div>,
          document.body,
        )
      : null;

  const FilterButton = (
    <>
      <div ref={buttonRef}>
        <ToolbarIconButton
          icon={commonIcons.filter}
          label="Tapis mengikut tarikh"
          isActive={isActive}
          onClick={handleToggle}
        />
      </div>
      {panel}
    </>
  );

  return { filteredRecords, isDateFilterActive: isActive, FilterButton };
}
