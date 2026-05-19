"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Calender from "@/app/components/Calender/Calender";
import Icon from "@/app/components/Icon/Icon";
import type { QuarterUnitOccupancyDetails } from "@/lib/quarters/quarter-units";

type KuartersUnitDatePickerProps = {
  fieldType: "moveInDate" | "moveOutDate";
  value: string;
  moveInDate?: string;
  disabled?: boolean;
  required?: boolean;
  occupancyHistory: QuarterUnitOccupancyDetails[];
  onChange: (value: string) => void;
};

// Helper function to parse a date string in "YYYY-MM-DD" format and return a Date object.
// If the input is invalid or not in the correct format, it returns null.
function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

// Formats a Date object to "YYYY-MM-DD" using LOCAL date parts to avoid UTC offset issues.
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper function that returns all dates (inclusive) between a start and end date as "YYYY-MM-DD" strings.
// If either date is invalid, returns an empty array.
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

// Helper function that takes a list of occupancy records and returns all occupied dates
// (inclusive of moveInDate and moveOutDate) as a flat, deduplicated array of "YYYY-MM-DD" strings.
// For records with no moveOutDate (still active), today is used as the end boundary.
function getOccupiedDates(occupancyHistory: QuarterUnitOccupancyDetails[]): string[] {
  const today = formatDateToString(new Date());
  const dateSet = new Set<string>();

  for (const record of occupancyHistory) {
    const start = record.moveInDate.slice(0, 10);
    const end = record.moveOutDate ? record.moveOutDate.slice(0, 10) : today;

    for (const date of getDatesBetween(start, end)) {
      dateSet.add(date);
    }
  }

  return Array.from(dateSet);
}

// Helper function to format the date value for display in the button. 
// It converts a "YYYY-MM-DD" string into a more user-friendly format like "DD MMM YYYY" (e.g., "25 Dec 2024"). 
// If the input is invalid, it returns the original string.
function formatDatePickerLabel(value: string) {
  const date = parseDateInput(value);

  if (!date)
    return value;

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
  onChange,
}: KuartersUnitDatePickerProps) {
  // Floating Picker State & Refs 
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ left: 0, bottom: 0 });

  // Position Calculation Logic
  const getFloatingPosition = () => {
    if (!buttonRef.current) return { left: 0, bottom: 0 };

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const horizontalPadding = 12;
    const verticalGap = 8;
    const pickerWidth = 320;

    const left = Math.min(
      Math.max(horizontalPadding, buttonRect.right - pickerWidth),
      window.innerWidth - pickerWidth - horizontalPadding,
    );

    const bottom = window.innerHeight - buttonRect.top + verticalGap;

    return { left, bottom };
  };

  // Floating Picker Logic
  // When the picker is open, we calculate its position based on the button's location and the viewport size to ensure it stays within the screen bounds.
  // We also add event listeners to handle clicks outside the picker (to close it) and to update the picker's position on window resize or scroll.
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

  // --- Date Restriction Logic ---
  //
  // Source data: occupancyHistory. (Passed from parent, fetched via API when editing a unit.)
  //
  // disabledDates: All individual dates covered by PAST occupancy records.
  //   - CURRENT occupancy is excluded because the active tenant's period should not block new entries.
  //   - Each record's moveInDate..moveOutDate range is expanded into individual "YYYY-MM-DD" strings using getOccupiedDates → getDatesBetween.
  //   - Dates are deduplicated via a Set.
  //   - These dates are greyed out / unselectable in the calendar for both Tarikh Masuk and Tarikh Keluar.
  //
  // minDate (Tarikh Keluar only): the selected Tarikh Masuk.
  //   - Prevents the user from picking a Tarikh Keluar that is earlier than Tarikh Masuk.
  //
  // maxDate (Tarikh Keluar only): the day before the earliest disabled date that falls after Tarikh Masuk.
  //   - Ensures the range [Tarikh Masuk, Tarikh Keluar] contains no disabled (occupied) dates.
  //   - Example: Tarikh Masuk = 1, disabled = [5, 6, 7] → maxDate = 4.
  //   - If no disabled date exists after Tarikh Masuk, maxDate is undefined (no upper cap).

  const disabledDates = getOccupiedDates(occupancyHistory.filter((record) => record.status !== "CURRENT"));

  const minDate = fieldType === "moveOutDate" ? moveInDate : undefined;

  const maxDate = (() => {
    if (fieldType !== "moveOutDate" || !moveInDate) return undefined;

    const firstBlockedAfterMoveIn = disabledDates
      .filter((d) => d > moveInDate)
      .sort()[0];

    if (!firstBlockedAfterMoveIn) return undefined;

    const dayBefore = parseDateInput(firstBlockedAfterMoveIn);
    if (!dayBefore) return undefined;

    dayBefore.setDate(dayBefore.getDate() - 1);
    return formatDateToString(dayBefore);
  })();

  // --- End of Date Restriction Logic ---

  // Auto-clear the selected value if it falls on a disabled date or outside the valid range.
  useEffect(() => {
    if (!value) return;

    const isDisabled = disabledDates.includes(value);
    const isBelowMin = minDate ? value < minDate : false;
    const isAboveMax = maxDate ? value > maxDate : false;

    if (isDisabled || isBelowMin || isAboveMax) {
      onChange("");
    }
  }, [value, disabledDates, minDate, maxDate]);

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
        {/* Icon */}
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
          <Icon icon="calendar_month" size={16} />
        </span>

        {/* Placeholder or Selected Date */}
        {/* If value exists, format it for display. Otherwise, show placeholder text. */}
        <span className={`flex items-center justify-center w-full ${value ? "truncate" : "truncate text-grey"}`}>
          {value ? formatDatePickerLabel(value) : "Pilih Tarikh"}
        </span>
      </button>

      {/* Floating Calendar Picker */}
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              data-kuarters-date-picker="true"
              className="fixed z-50 rounded-3xl border border-light-grey/20 bg-white shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
              style={{
                left: `${pickerPosition.left}px`,
                bottom: `${pickerPosition.bottom}px`,
                width: "320px",
              }}
              role="dialog"
              aria-label="Pilih tarikh penghunian"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Calendar Component */}
              <Calender
                containerRef={containerRef}
                isOpen={true}
                value={value}
                required={required}
                minDate={minDate}
                maxDate={maxDate}
                disabledDates={disabledDates}
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