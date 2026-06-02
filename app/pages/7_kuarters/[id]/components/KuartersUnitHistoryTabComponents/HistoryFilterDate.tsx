"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import FilterDate from "@/app/components/FIlter/FilterDate";
import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";

import type { QuarterUnitOccupancyDetails } from "@/lib/quarters/quarter-units";

type DateFilterValue = { startDate: string; endDate: string };

type UseHistoryFilterDateResult = {
  filteredRecords: QuarterUnitOccupancyDetails[];
  dateFilterKey: string;
  DateFilterControl: React.ReactNode;
};

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function useHistoryFilterDate(
  records: QuarterUnitOccupancyDetails[],
): UseHistoryFilterDateResult {
  const dateFilterRef = useRef<HTMLDivElement | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    startDate: "",
    endDate: "",
  });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [dateFilterAnchorStyle, setDateFilterAnchorStyle] = useState<CSSProperties>({});

  const isDateFilterActive = Boolean(dateFilter.startDate || dateFilter.endDate);

  useEffect(() => {
    if (!isDateFilterOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (dateFilterRef.current?.contains(target)) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest("[data-filter-date-panel]")
      ) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest("[data-filter-date-calendar]")
      ) {
        return;
      }

      setIsDateFilterOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isDateFilterOpen]);

  const filteredRecords = useMemo(() => {
    if (!isDateFilterActive) {
      return records;
    }

    const rangeStartTime = dateFilter.startDate
      ? new Date(`${dateFilter.startDate}T00:00:00`).getTime()
      : Number.NEGATIVE_INFINITY;
    const rangeEndTime = dateFilter.endDate
      ? new Date(`${dateFilter.endDate}T23:59:59.999`).getTime()
      : Number.POSITIVE_INFINITY;

    return records.filter((occupancy) => {
      const moveInDate = parseDate(occupancy.moveInDate);
      const moveOutDate = parseDate(occupancy.moveOutDate);

      // This filter requires both tarikh masuk and tarikh keluar to be within the selected range.
      if (!moveInDate || !moveOutDate) {
        return false;
      }

      const moveInTime = moveInDate.getTime();
      const moveOutTime = new Date(moveOutDate).setHours(23, 59, 59, 999);

      return (
        moveInTime >= rangeStartTime &&
        moveInTime <= rangeEndTime &&
        moveOutTime >= rangeStartTime &&
        moveOutTime <= rangeEndTime
      );
    });
  }, [dateFilter.endDate, dateFilter.startDate, isDateFilterActive, records]);

  const dateFilterKey = `${dateFilter.startDate}::${dateFilter.endDate}`;

  const DateFilterControl = (
    <div ref={dateFilterRef} className="relative">
      <ToolbarButton
        icon={commonIcons.calendar}
        label="Tapis tarikh sejarah penghunian"
        isActive={isDateFilterOpen || isDateFilterActive}
        onClick={() => {
          if (!isDateFilterOpen && dateFilterRef.current) {
            const rect = dateFilterRef.current.getBoundingClientRect();
            setDateFilterAnchorStyle({
              position: "fixed",
              top: rect.bottom,
              right: window.innerWidth - rect.right,
              zIndex: 9999,
            });
          }

          setIsDateFilterOpen((currentState) => !currentState);
        }}
      />

      {isDateFilterOpen && typeof document !== "undefined"
        ? createPortal(
            <div style={dateFilterAnchorStyle} data-filter-date-panel>
              <FilterDate
                title="Tarikh"
                description="Pilih julat tarikh rekod yang ingin dipaparkan."
                ariaLabel="Tapisan tarikh sejarah penghunian"
                value={dateFilter}
                onApply={(value) => {
                  setDateFilter(value);
                }}
                onClear={() => {
                  setDateFilter({ startDate: "", endDate: "" });
                  setIsDateFilterOpen(false);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );

  return {
    filteredRecords,
    dateFilterKey,
    DateFilterControl,
  };
}
