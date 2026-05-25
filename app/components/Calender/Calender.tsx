"use client";

import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from "react";
import Icon from "@/app/components/Icon/Icon";

/**
 * Calender component
 *
 * To Used this Component:
 * 1) Manage the open/close state and selected value in the parent component.
 * 2) Pass the necessary props to the Calender component, including:
 *    - containerRef: Ref for the container element to detect outside clicks for closing the picker.
 *    - isOpen: Whether the calendar popup is open.
 *    - value: Selected date value in "YYYY-MM-DD" format.
 *    - onChange: Callback function when the selected date changes.
 *    - onClose: Callback function when the calendar popup is closed.
 *    - minDate: Minimum selectable date in "YYYY-MM-DD" format.
 *    - maxDate: Maximum selectable date in "YYYY-MM-DD" format.
 *    - disabledDates: Array of date strings in "YYYY-MM-DD" format that are disabled.
 *    - disabledDateGroups: Array of disabled date groups for enhanced visual cues and notes.
 *    - minDateDisabledMeta: Metadata for the minimum disabled date.
 *    - maxDateDisabledMeta: Metadata for the maximum disabled date.
 *    - disableAbsolutePositioning: Whether to disable absolute positioning for the calendar popup.
 *    - scale: Scale factor for the calendar popup.
 * 3) The Calender component will handle the rendering of the calendar UI, navigation between months and applying the necessary restrictions and visual cues based on the provided props.
 */

// Types for disabled date metadata and groups.
// It allows for enhanced visual cues and notes on why certain dates are disabled.
export type DisabledDateGroup = {
    dates: string[];          // Array of date strings in "YYYY-MM-DD" format that belong to this group.
    note: string;             // Explanation note for the disabled dates in this group, shown as a tooltip.
    textColor?: string;       // Optional custom text color for the disabled dates in this group.
    backgroundColor?: string; // Optional custom background color for the disabled dates in this group.
    className?: string;       // Optional additional CSS class for custom styling of the disabled dates in this group.
};

// Metadata for individual disabled dates.
// It is used when a date is disabled due to minDate/maxDate constraints or individual disabledDates.
export type DisabledDateMeta = {
    note?: string;            // Explanation note for the disabled date, shown as a tooltip.
    textColor?: string;       // Optional custom text color for the disabled date.
    backgroundColor?: string; // Optional custom background color for the disabled date.
    className?: string;       // Optional additional CSS class for custom styling of the disabled date.
};

// Props for the Calender component.
type CalenderProps = {
    containerRef: RefObject<HTMLElement | null>; // Ref for the container element to detect outside clicks for closing the picker.
    isOpen: boolean;                             // Whether the calendar popup is open.
    value: string;                               // Selected date value in "YYYY-MM-DD" format.
    required?: boolean;                          // Whether the date selection is required.
    minDate?: string;                            // Minimum selectable date in "YYYY-MM-DD" format.
    maxDate?: string;                            // Maximum selectable date in "YYYY-MM-DD" format.
    disabledDates?: string[];                    // Array of date strings in "YYYY-MM-DD" format that are disabled.
    disabledDateGroups?: DisabledDateGroup[];    // Array of disabled date groups for enhanced visual cues and notes.
    minDateDisabledMeta?: DisabledDateMeta;      // Metadata for the minimum disabled date.
    maxDateDisabledMeta?: DisabledDateMeta;      // Metadata for the maximum disabled date.
    onChange: (value: string) => void;           // Callback function when the selected date changes.
    onClose: () => void;                         // Callback function when the calendar popup is closed.
    disableAbsolutePositioning?: boolean;        // Whether to disable absolute positioning for the calendar popup.
    monthOnly?: boolean;                         // Whether to show only month selection and return the first day of the selected month.
    scale?: number;                              // Scale factor for the calendar popup.
};

// Weekday labels for the calendar header, with both label and full title for accessibility.
const WEEKDAY_LABELS = [
    { label: "A", title: "Ahad" },
    { label: "I", title: "Isnin" },
    { label: "S", title: "Selasa" },
    { label: "R", title: "Rabu" },
    { label: "K", title: "Khamis" },
    { label: "J", title: "Jumaat" },
    { label: "S", title: "Sabtu" },
] as const;

// Month indices for the month picker, representing January (0) to December (11).
const MONTH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

// Main Calender component implementation.
export default function Calender(props: CalenderProps) {
    if (!props.isOpen)
        return null;

    return (
        <CalenderPanel
            key={`${props.value}-${props.monthOnly ? "month" : "date"}`}
            {...props}
        />
    );
}

function CalenderPanel({
    containerRef,
    isOpen,
    value,
    minDate,
    maxDate,
    disabledDates = [],
    disabledDateGroups = [],
    minDateDisabledMeta,
    maxDateDisabledMeta,
    onChange,
    onClose,
    disableAbsolutePositioning = false,
    monthOnly = false,
    scale,
}: CalenderProps) {
    // State Management
    const [visibleMonth, setVisibleMonth] = useState(parseDateInput(value) ?? startOfDay(new Date()));
    const [showMonthYearPicker, setShowMonthYearPicker] = useState(monthOnly);

    // Derive current year and month from the visibleMonth state for header display and navigation logic.
    const currentYear = visibleMonth.getFullYear();
    const currentMonth = visibleMonth.getMonth();

    // Memoized calculation of the calendar days to display based on the currently visible month. 
    // It generates a 6-week grid starting from the Sunday of the week containing the first day of the month.
    const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

    // Memoized merging of disabled dates and disabled date groups into a single map for easy lookup during rendering.
    const disabledDateMeta = useMemo(() => {
        return mergeDisabledDateMeta(disabledDates, disabledDateGroups);
    }, [disabledDateGroups, disabledDates]);

    // Handlers for navigating to the previous and next month.
    const handlePrevious = () => {
        if (showMonthYearPicker) {
            setVisibleMonth(new Date(currentYear - 1, currentMonth, 1));
            return;
        }

        setVisibleMonth((currentDate) => addMonths(currentDate, -1));
    };

    // Handler for navigating to the next month.
    const handleNext = () => {
        if (showMonthYearPicker) {
            setVisibleMonth(new Date(currentYear + 1, currentMonth, 1));
            return;
        }

        setVisibleMonth((currentDate) => addMonths(currentDate, 1));
    };

    // Effect to handle closing the calendar picker when clicking outside of it.
    useEffect(() => {
        if (!isOpen)
            return;

        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, containerRef, onClose]);

    return (
        <div
            className={`${disableAbsolutePositioning ? "relative" : "absolute top-full left-0 right-0"} z-50 w-full rounded-3xl bg-white p-2 shadow-lg flex flex-col gap-2`}
            style={scale !== undefined ? { zoom: scale } : undefined}
        >
            {/* Header (Month and Year) */}
            <div className="flex items-center justify-between">
                {/* Previous Month Button */}
                <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
                    aria-label="Bulan Sebelumnya"
                    title="Bulan Sebelumnya"
                    onClick={handlePrevious}
                >
                    <Icon icon="chevron_left" size={20} />
                </button>

                {/* Month and Year Label */}
                <button
                    type="button"
                    className="flex-1 cursor-pointer text-center text-sm font-bold text-dark-grey transition-colors hover:text-dark-blue"
                    onClick={() => {
                        if (!monthOnly) {
                            setShowMonthYearPicker(!showMonthYearPicker);
                        }
                    }}
                >
                    {showMonthYearPicker
                        ? `${currentYear}`
                        : formatMonthLabel(visibleMonth)}
                </button>

                {/* Next Month Button */}
                <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
                    aria-label="Bulan Seterusnya"
                    title="Bulan Seterusnya"
                    onClick={handleNext}
                >
                    <Icon icon="chevron_right" size={20} />
                </button>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-grey">
                {WEEKDAY_LABELS.map((day, index) => (
                    <div key={`${day.label}-${index}`} title={day.title}>
                        {day.label}
                    </div>
                ))}
            </div>

            <hr />

            {/* Calendar Grid */}
            {showMonthYearPicker ? (
                // Month Picker
                <div className="grid grid-cols-4 gap-1">
                    {MONTH_INDICES.map((monthIdx) => {
                        const monthName = new Date(visibleMonth.getFullYear(), monthIdx, 1).toLocaleDateString("ms-MY", {month: "short"});
                        const monthDateValue = formatDateInput(new Date(visibleMonth.getFullYear(), monthIdx, 1));
                        const isBelowMinDate = Boolean(minDate && monthDateValue.slice(0, 7) < minDate.slice(0, 7));
                        const isAboveMaxDate = Boolean(maxDate && monthDateValue.slice(0, 7) > maxDate.slice(0, 7));
                        const isDisabled = isBelowMinDate || isAboveMaxDate;

                        return (
                            <button
                                key={monthIdx}
                                type="button"
                                aria-disabled={isDisabled}
                                tabIndex={isDisabled ? -1 : 0}
                                className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
                                    isDisabled
                                        ? "cursor-not-allowed text-light-grey/60"
                                        : monthIdx === currentMonth
                                        ? "bg-dark-blue text-white"
                                        : "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                                }`}
                                onClick={() => {
                                    if (isDisabled) {
                                        return;
                                    }
                                    const nextVisibleMonth = new Date(visibleMonth.getFullYear(), monthIdx, 1);
                                    setVisibleMonth(nextVisibleMonth);
                                    if (monthOnly) {
                                        onChange(formatDateInput(nextVisibleMonth));
                                        onClose();
                                        return;
                                    }
                                    setShowMonthYearPicker(false);
                                }}
                            >
                                {monthName}
                            </button>
                        );
                    })}
                </div>
            ) : (
                // Day Picker
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day) => {
                        const dateValue = formatDateInput(day.date);
                        const isSelected = dateValue === value;
                        const isVisibleMonth = day.date.getMonth() === visibleMonth.getMonth();
                        const dateDisabledMeta = disabledDateMeta.get(dateValue);
                        const isInDisabledDates = Boolean(dateDisabledMeta);
                        const isBelowMinDate = Boolean(minDate && dateValue < minDate);
                        const isAboveMaxDate = Boolean(maxDate && dateValue > maxDate);
                        const constraintDisabledMeta = isBelowMinDate
                            ? minDateDisabledMeta
                            : isAboveMaxDate
                                ? maxDateDisabledMeta
                                : undefined;
                        const activeDisabledMeta = dateDisabledMeta ?? constraintDisabledMeta;
                        const isDisabled = Boolean(
                            isInDisabledDates ||
                            isBelowMinDate ||
                            isAboveMaxDate,
                        );
                        const shouldShowDisabledStyle = isDisabled && isVisibleMonth;
                        const hasCustomDisabledVisual = Boolean(
                            shouldShowDisabledStyle &&
                            (activeDisabledMeta?.textColor || activeDisabledMeta?.backgroundColor || activeDisabledMeta?.className),
                        );
                        const disabledCustomStyle: CSSProperties | undefined = hasCustomDisabledVisual
                            ? {
                                color: activeDisabledMeta?.textColor,
                                backgroundColor: activeDisabledMeta?.backgroundColor,
                            }
                            : undefined;

                        return (
                            <button
                                key={dateValue}
                                type="button"
                                aria-disabled={isDisabled}
                                tabIndex={isDisabled ? -1 : 0}
                                title={activeDisabledMeta?.note ?? undefined}
                                className={`grid h-9 place-items-center rounded-full text-sm font-bold transition-colors ${
                                    shouldShowDisabledStyle && !hasCustomDisabledVisual
                                        ? "cursor-not-allowed text-red bg-red/20"
                                        : isDisabled
                                            ? "cursor-not-allowed text-light-grey/60"
                                            : isSelected
                                                ? "bg-dark-blue text-white"
                                                : isVisibleMonth
                                                    ? "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                                                    : "text-light-grey hover:bg-light-blue"
                                    } ${hasCustomDisabledVisual ? (activeDisabledMeta?.className ?? "") : ""}`}
                                style={disabledCustomStyle}
                                onClick={() => {
                                    if (isDisabled)
                                        return;
                                    onChange(dateValue);
                                    onClose();
                                }}
                            >
                                {day.date.getDate()}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// --- Helper Functions ---
// Caution: These functions are used for internal logic and formatting within the Calender component.
// Caution: Thus, it is not preferable to use and modify these functions to fit them into other contexts. 
// Caution: If similar functionality is needed elsewhere, consider creating separate utility functions outside of this component.

// Helper function to parse date string in "YYYY-MM-DD" format and return a Date object. Returns null if the input is invalid.
function parseDateInput(value: string | undefined) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) 
        return null;

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
}

// Helper function to format a date string for display in the input field. If the date is invalid, it returns the original value.
function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Helper function to format a date string for display in the input field. If the date is invalid, it returns the original value.
function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

// Helper function to build the days for the calendar grid. It generates an array of 42 days (6 weeks) starting from the first day of the month, adjusted to the previous Sunday.
function buildCalendarDays(monthDate: Date) {
    const firstDayOfMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
    );
    const firstCalendarDate = new Date(firstDayOfMonth);
    firstCalendarDate.setDate(
        firstCalendarDate.getDate() - firstCalendarDate.getDay(),
    );

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(firstCalendarDate);
        date.setDate(firstCalendarDate.getDate() + index);

        return { date };
    });
}

// Helper function to format a date string for display in the input field. If the date is invalid, it returns the original value.
function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Helper function to format the month label in the calendar header. It formats the date in "MMMM YYYY" format. If the date is invalid, it returns the original value.
function formatMonthLabel(date: Date) {
    return new Intl.DateTimeFormat("ms-MY", {
        month: "long",
        year: "numeric",
    }).format(date);
}

// Helper function to merge disabled dates and disabled date groups into a single map for easy lookup. It combines individual disabled dates and grouped disabled dates, allowing for enhanced visual cues and notes on why certain dates are disabled. The resulting map has date strings as keys and their corresponding metadata (notes, colors, etc.) as values.
function mergeDisabledDateMeta(
    disabledDates: string[],
    disabledDateGroups: DisabledDateGroup[],
) {
    const dateMetaMap = new Map<string, DisabledDateMeta>();

    for (const dateValue of disabledDates) {
        dateMetaMap.set(dateValue, {});
    }

    for (const group of disabledDateGroups) {
        const groupMeta: DisabledDateMeta = {
            note: group.note,
            textColor: group.textColor,
            backgroundColor: group.backgroundColor,
            className: group.className,
        };

        for (const dateValue of group.dates) {
            const existingMeta = dateMetaMap.get(dateValue) ?? {};
            dateMetaMap.set(dateValue, {
                ...existingMeta,
                ...groupMeta,
            });
        }
    }

    return dateMetaMap;
}

// --- End of Helper Functions ---
