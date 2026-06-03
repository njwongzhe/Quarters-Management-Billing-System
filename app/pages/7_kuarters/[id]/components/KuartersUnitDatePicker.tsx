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

// Returns occupied dates for completed ranges only. Open-ended records are handled
// by backend validation and by the next move-in upper bound.
function getOccupiedDates(occupancyHistory: OccupancyDateRange[]): string[] {
  const dateSet = new Set<string>();

  for (const record of occupancyHistory) {
    if (!record.moveOutDate) {
      continue;
    }

    const start = record.moveInDate.slice(0, 10);
    const end = record.moveOutDate.slice(0, 10);

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
  excludedOccupancyId = null,
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
  // 1) Collect blocked dates from the selected unit's completed occupancy ranges.
  //
  // 2) For Tarikh Keluar, build [minDate, maxDate] constraints:
  //    - minDate = Selected Tarikh Masuk.
  //                It prevents selecting a Tarikh Keluar that is earlier than Tarikh Masuk. (Red)
  //    - maxDate = Day before the earliest blocked date after Tarikh Masuk.
  //                It ensures between Tarikh Masuk and Tarikh Keluar there is no occupied date to avoid selecting a Tarikh Keluar that overlaps with occupied dates. (Orange)
  //                Example: Tarikh Masuk = 1, disabled = [5, 6, 7] → maxDate = 4.
  //
  // 3) Pass visual metadata so calendar can color and explain each disabled rule via tooltip.

  const UNIT_OCCUPIED_NOTE = "Tarikh ini unit sudah didiami penghuni lain.";
  const MOVE_OUT_MIN_NOTE = "Tarikh Keluar mesti selepas Tarikh Masuk.";
  const MOVE_OUT_RANGE_NOTE = "Julat Tarikh Masuk hingga Tarikh Keluar tidak boleh merangkumi tarikh berpenghuni.";

  const relevantOccupancyHistory = occupancyHistory.filter(
    (record) => !excludedOccupancyId || record.id !== excludedOccupancyId,
  );
  const unitOccupiedDates = getOccupiedDates(relevantOccupancyHistory);
  const nextMoveInDate = (() => {
    if (fieldType !== "moveOutDate" || !moveInDate) {
      return undefined;
    }

    return relevantOccupancyHistory
      .map((record) => record.moveInDate.slice(0, 10))
      .filter((date) => date > moveInDate)
      .sort()[0];
  })();

  // Tarikh Masuk Blocking: Grouped disabled rules with distinct colors and notes.
  const moveInDisabledDateGroups: DisabledDateGroup[] = [
    {
      dates: unitOccupiedDates,
      note: UNIT_OCCUPIED_NOTE,
      textColor: "#854d0e", // Dark Yellow
      backgroundColor: "#fef9c3", // Light Yellow
    },
  ].filter((group) => group.dates.length > 0);

  // Tarikh Masuk Blocking Dates Array
  const moveInDisabledDates = Array.from(
    new Set(moveInDisabledDateGroups.flatMap((group) => group.dates)),
  );

  const minDate = (() => {
    if (fieldType !== "moveOutDate" || !moveInDate) {
      return undefined;
    }

    const dayAfterMoveIn = parseDateInput(moveInDate);

    if (!dayAfterMoveIn) {
      return undefined;
    }

    dayAfterMoveIn.setDate(dayAfterMoveIn.getDate() + 1);
    return formatDateToString(dayAfterMoveIn);
  })();

  // Tarikh Keluar Blocking: Upper bound stops right before the next occupancy move-in.
  const maxDate = (() => {
    if (fieldType !== "moveOutDate" || !moveInDate || !nextMoveInDate) {
      return undefined;
    }

    // maxDate is the day before the first blocked date after Tarikh Masuk.
    const dayBeforeFirstBlocked = parseDateInput(nextMoveInDate);
    if (!dayBeforeFirstBlocked)
      return undefined;

    // Subtract one day to get the maxDate. (Since the blocked date itself is not allowed, we need to step back one day.)
    dayBeforeFirstBlocked.setDate(dayBeforeFirstBlocked.getDate() - 1);
    return formatDateToString(dayBeforeFirstBlocked);
  })();

  // Tarikh Keluar Blocking: Visual hint for minDate rule (< Tarikh Masuk).
  const moveOutMinDateMeta: DisabledDateMeta | undefined =
    fieldType === "moveOutDate" && moveInDate
      ? {
          note: MOVE_OUT_MIN_NOTE,
          textColor: "#991b1b", // Dark Red
          backgroundColor: "#fee2e2", // Light Red
        }
      : undefined;

  // Tarikh Keluar Blocking: Visual hint for maxDate rule. (Range must not include occupied dates.)
  const moveOutMaxDateMeta: DisabledDateMeta | undefined =
    fieldType === "moveOutDate" && maxDate
      ? {
          note: MOVE_OUT_RANGE_NOTE,
          textColor: "#9a3412", // Dark Orange
          backgroundColor: "#ffedd5", // Light Orange
        }
      : undefined;

  // Calendar Component Props: Disabled dates and groups are only relevant for Tarikh Masuk since Tarikh Keluar uses min/max date restrictions instead of discrete disabled dates.
  const calendarDisabledDates = fieldType === "moveInDate" ? moveInDisabledDates : [];
  const calendarDisabledDateGroups = fieldType === "moveInDate" ? moveInDisabledDateGroups : [];

  // --- End of Date Restriction Logic ---

  // Auto-clear the selected value if it falls on a disabled date or outside the valid range.
  useEffect(() => {
    if (!value) return;

    const isDisabled =
      fieldType === "moveInDate" && calendarDisabledDates.includes(value);
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
                scale={0.85}
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
