"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Calender, {
  type DisabledDateGroup,
  type DisabledDateMeta,
} from "@/app/components/Calender/Calender";
import Icon from "@/app/components/Icon/Icon";

type OccupancyDateRange = {
  id?: string;
  moveInDate: string;
  moveOutDate: string | null;
  status: "CURRENT" | "PAST";
};

type KuartersUnitDatePickerProps = {
  fieldType: "moveInDate" | "moveOutDate";
  value: string;
  moveInDate?: string;
  disabled?: boolean;
  required?: boolean;
  occupancyHistory: OccupancyDateRange[];
  excludedOccupancyId?: string | null;
  onChange: (value: string) => void;
};

function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDatesBetween(startDate: string, endDate: string): string[] {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateToString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getOccupiedDates(occupancyHistory: OccupancyDateRange[]): string[] {
  const dateSet = new Set<string>();
  for (const record of occupancyHistory) {
    if (!record.moveOutDate) continue;
    const start = record.moveInDate.slice(0, 10);
    const end = record.moveOutDate.slice(0, 10);
    for (const date of getDatesBetween(start, end)) {
      dateSet.add(date);
    }
  }
  return Array.from(dateSet);
}

function formatDatePickerLabel(value: string) {
  const date = parseDateInput(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function KuartersUnitDatePicker({
  fieldType,
  value,
  moveInDate,
  disabled = false,
  required = false,
  occupancyHistory = [],
  excludedOccupancyId = null,
  onChange,
}: KuartersUnitDatePickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const [pickerPosition, setPickerPosition] = useState({ left: "auto", right: "0px", bottom: 0 });

  // Position Calculation Logic
  const getFloatingPosition = () => {
    if (!buttonRef.current) return { left: "auto", right: "0px", bottom: 0 };

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const verticalGap = 8;
    
    const rightDistance = window.innerWidth - buttonRect.right;
    const bottomPosition = window.innerHeight - buttonRect.top + verticalGap;

    if (buttonRect.right < 230) {
      return {
        left: `${Math.max(8, buttonRect.left)}px`,
        right: "auto",
        bottom: bottomPosition,
      };
    }

    return {
      left: "auto",
      right: `${Math.max(0, rightDistance)}px`,
      bottom: bottomPosition,
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const position = getFloatingPosition();
    setPickerPosition(position);

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const pickerElement = document.querySelector("[data-kuarters-date-picker='true']");

      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        pickerElement &&
        !pickerElement.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function updatePosition() {
      const newPosition = getFloatingPosition();
      setPickerPosition(newPosition);
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const UNIT_OCCUPIED_NOTE = "Tarikh ini unit sudah didiami penghuni lain.";
  const MOVE_OUT_MIN_NOTE = "Tarikh Keluar mesti selepas Tarikh Masuk.";
  const MOVE_OUT_RANGE_NOTE = "Julat Tarikh Masuk hingga Tarikh Keluar tidak boleh merangkumi tarikh berpenghuni.";

  const relevantOccupancyHistory = occupancyHistory.filter(
    (record) => !excludedOccupancyId || record.id !== excludedOccupancyId,
  );
  const unitOccupiedDates = getOccupiedDates(relevantOccupancyHistory);
  const nextMoveInDate = (() => {
    if (fieldType !== "moveOutDate" || !moveInDate) return undefined;
    return relevantOccupancyHistory
      .map((record) => record.moveInDate.slice(0, 10))
      .filter((date) => date > moveInDate)
      .sort()[0];
  })();

  const moveInDisabledDateGroups: DisabledDateGroup[] = [
    {
      dates: unitOccupiedDates,
      note: UNIT_OCCUPIED_NOTE,
      textColor: "#854d0e",
      backgroundColor: "#fef9c3",
    },
  ].filter((group) => group.dates.length > 0);

  const moveInDisabledDates = Array.from(
    new Set(moveInDisabledDateGroups.flatMap((group) => group.dates)),
  );

  const minDate = (() => {
    if (fieldType !== "moveOutDate" || !moveInDate) return undefined;
    const dayAfterMoveIn = parseDateInput(moveInDate);
    if (!dayAfterMoveIn) return undefined;
    dayAfterMoveIn.setDate(dayAfterMoveIn.getDate() + 1);
    return formatDateToString(dayAfterMoveIn);
  })();

  const maxDate = (() => {
    if (fieldType !== "moveOutDate" || !moveInDate || !nextMoveInDate) return undefined;
    const dayBeforeFirstBlocked = parseDateInput(nextMoveInDate);
    if (!dayBeforeFirstBlocked) return undefined;
    dayBeforeFirstBlocked.setDate(dayBeforeFirstBlocked.getDate() - 1);
    return formatDateToString(dayBeforeFirstBlocked);
  })();

  const moveOutMinDateMeta: DisabledDateMeta | undefined =
    fieldType === "moveOutDate" && moveInDate
      ? { note: MOVE_OUT_MIN_NOTE, textColor: "#991b1b", backgroundColor: "#fee2e2" }
      : undefined;

  const moveOutMaxDateMeta: DisabledDateMeta | undefined =
    fieldType === "moveOutDate" && maxDate
      ? { note: MOVE_OUT_RANGE_NOTE, textColor: "#9a3412", backgroundColor: "#ffedd5" }
      : undefined;

  const calendarDisabledDates = fieldType === "moveInDate" ? moveInDisabledDates : [];
  const calendarDisabledDateGroups = fieldType === "moveInDate" ? moveInDisabledDateGroups : [];

  useEffect(() => {
    if (!value) return;
    const isDisabled = fieldType === "moveInDate" && calendarDisabledDates.includes(value);
    const isBelowMin = minDate ? value < minDate : false;
    const isAboveMax = maxDate ? value > maxDate : false;
    if (isDisabled || isBelowMin || isAboveMax) {
      onChange("");
    }
  }, [value, fieldType, calendarDisabledDates, minDate, maxDate, onChange]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Date Picker Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={`flex min-h-10 w-full items-center gap-2 rounded-2xl border bg-white py-2 pl-3 pr-3 text-left text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_10px_rgba(15,23,42,0.04)] outline-none transition-colors disabled:cursor-not-allowed disabled:bg-background disabled:text-light-grey ${
          isOpen
            ? "border-dark-blue text-dark-blue"
            : "border-light-grey/25 text-dark-grey hover:border-dark-blue/30"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((state) => !state);
        }}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
          <Icon icon="calendar_month" size={16} />
        </span>
        <span className={`flex items-center justify-center w-full ${value ? "truncate" : "truncate text-grey"}`}>
          {value ? formatDatePickerLabel(value) : "Pilih Tarikh"}
        </span>
      </button>

      {/* Floating Calendar Picker */}
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              data-kuarters-date-picker="true"
              className="fixed z-50"
              style={{
                left: pickerPosition.left,
                right: pickerPosition.right,
                bottom: `${pickerPosition.bottom}px`,
              }}
              role="dialog"
              aria-label="Pilih tarikh penghunian"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Calender
                containerRef={containerRef}
                isOpen={true}
                value={value}
                required={required}
                minDate={minDate}
                maxDate={maxDate}
                disabledDates={calendarDisabledDates}
                disabledDateGroups={calendarDisabledDateGroups}
                minDateDisabledMeta={moveOutMinDateMeta}
                maxDateDisabledMeta={moveOutMaxDateMeta}
                disableAbsolutePositioning={true}
                onChange={(newValue) => {
                  onChange(newValue);
                  setIsOpen(false);
                }}
                onClose={() => setIsOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}