"use client";

import { useEffect, useState, type RefObject } from "react";

import Icon from "@/app/components/Icon/Icon";

type CalenderProps = {
    containerRef: RefObject<HTMLElement | null>;
    isOpen: boolean;
    value: string;
    required?: boolean;
    minDate?: string;
    maxDate?: string;
    disabledDates?: string[];
    onChange: (value: string) => void;
    onClose: () => void;
    disableAbsolutePositioning?: boolean;
};

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

// Helper function to format the label for the calendar picker button. It formats the date in "DD MMM YYYY" format. If the date is invalid, it returns the original value.
function formatDatePickerLabel(value: string) {
    const date = parseDateInput(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat("ms-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

// Helper function to format the month label in the calendar header. It formats the date in "MMMM YYYY" format. If the date is invalid, it returns the original value.
function formatMonthLabel(date: Date) {
    return new Intl.DateTimeFormat("ms-MY", {
        month: "long",
        year: "numeric",
    }).format(date);
}

export default function Calender({
    containerRef,
    isOpen,
    value,
    minDate,
    maxDate,
    disabledDates = [],
    onChange,
    onClose,
    disableAbsolutePositioning = false,
}: CalenderProps) {
    const initialDate = parseDateInput(value);
    const [visibleMonth, setVisibleMonth] = useState(initialDate ?? startOfDay(new Date()));
    const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
    const days = buildCalendarDays(visibleMonth);
    const currentYear = visibleMonth.getFullYear();
    const currentMonth = visibleMonth.getMonth();

    // Effect to update the visible month when the value changes while the picker is open.
    useEffect(() => {
        if (!isOpen)
            return;
        setVisibleMonth(parseDateInput(value) ?? startOfDay(new Date()));
    }, [isOpen, value]);

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

    if (!isOpen)
        return null;

    return (
        <div className={`${disableAbsolutePositioning ? "relative" : "absolute top-full left-0 right-0"} z-50 w-full rounded-3xl bg-white p-2 shadow-lg flex flex-col gap-2`}>
            {/* Header (Month and Year) */}
            <div className="flex items-center justify-between">
                {/* Previous Month Button */}
                <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-xl text-grey transition-colors hover:bg-light-blue hover:text-dark-blue"
                    aria-label="Bulan Sebelumnya"
                    title="Bulan Sebelumnya"
                    onClick={() => {
                        if (showMonthYearPicker) 
                            setVisibleMonth(new Date(currentYear - 1, currentMonth, 1));
                        else 
                            setVisibleMonth((currentDate) => addMonths(currentDate, -1));
                    }}
                >
                    <Icon icon="chevron_left" size={20} />
                </button>

                {/* Month and Year Label */}
                <button
                    type="button"
                    className="flex-1 text-center text-sm font-bold text-dark-grey transition-colors hover:text-dark-blue cursor-pointer"
                    onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
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
                    onClick={() => {
                        if (showMonthYearPicker) 
                            setVisibleMonth(new Date(currentYear + 1, currentMonth, 1));
                        else 
                            setVisibleMonth((currentDate) => addMonths(currentDate, 1));
                    }}
                >
                    <Icon icon="chevron_right" size={20} />
                </button>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-grey">
                {[
                    { label: "A", title: "Ahad" },
                    { label: "I", title: "Isnin" },
                    { label: "S", title: "Selasa" },
                    { label: "R", title: "Rabu" },
                    { label: "K", title: "Khamis" },
                    { label: "J", title: "Jumaat" },
                    { label: "S", title: "Sabtu" },
                ].map((day, index) => (
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
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((monthIdx) => {
                        const monthName = new Date(visibleMonth.getFullYear(), monthIdx, 1).toLocaleDateString("ms-MY", {month: "short"});

                        return (
                            <button
                                key={monthIdx}
                                type="button"
                                className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
                                    monthIdx === currentMonth
                                        ? "bg-dark-blue text-white"
                                        : "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                                }`}
                                onClick={() => {
                                    setVisibleMonth(new Date(visibleMonth.getFullYear(), monthIdx, 1));
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
                        const isInDisabledDates = disabledDates.includes(dateValue);
                        const isDisabled = Boolean(
                            isInDisabledDates ||
                            (minDate && dateValue < minDate) ||
                            (maxDate && dateValue > maxDate),
                        );
                        const shouldShowDisabledStyle = isDisabled && isVisibleMonth;

                        return (
                            <button
                                key={dateValue}
                                type="button"
                                disabled={isDisabled}
                                className={`grid h-9 place-items-center rounded-full text-sm font-bold transition-colors ${
                                    shouldShowDisabledStyle
                                        ? "cursor-not-allowed text-red bg-red/20"
                                        : isDisabled
                                            ? "cursor-not-allowed text-light-grey/60"
                                            : isSelected
                                                ? "bg-dark-blue text-white"
                                                : isVisibleMonth
                                                    ? "text-dark-grey hover:bg-light-blue hover:text-dark-blue"
                                                    : "text-light-grey hover:bg-light-blue"
                                }`}
                                onClick={() => {
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
