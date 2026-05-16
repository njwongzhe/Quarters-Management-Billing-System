"use client";

import { useRef, useState } from "react";
import Calender from "./Calender";

type FieldState = "active" | "inactive";

type CalenderFieldProps = {
    label: string;
    value: string;
    state: FieldState;
    onChange: (value: string) => void;
    required?: boolean;
    minDate?: string;
    maxDate?: string;
    disabledDates?: string[];
    className?: string;
    labelFontSize?: number | string;
    inputFontSize?: number | string;
    inputMinHeight?: number | string;
    placeholder?: string;
};

// Helper function to display value or "N/A" if value is null or empty.
function displayValue(value: string) {
    if (value == null || value === "")
        return "N/A";

    return value;
}

export default function CalenderField({
    label,
    value,
    state,
    onChange,
    required = false,
    minDate,
    maxDate,
    disabledDates = [],
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    placeholder = "",
}: CalenderFieldProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const isDisabled = state === "inactive";

    function togglePicker() {
        if (!isDisabled) setIsOpen((prev) => !prev);
    }

    return (
        <div ref={containerRef} className={`${className} relative`}>
            {/* Input Field with Label */}
            <div onClick={togglePicker}>
                <div className="flex flex-col gap-2 tracking-widest">
                    <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
                    <input
                        type="text"
                        value={displayValue(value)}
                        disabled={isDisabled}
                        readOnly
                        placeholder={placeholder}
                        className={`rounded-md p-3 text-sm min-h-12 border outline-none ${!isDisabled ? "cursor-pointer" : ""} border border-light-grey/40
                            ${state === "active" ? "bg-white" : "bg-transparent"
                        }`}
                        style={{
                            fontSize: inputFontSize,
                            minHeight: inputMinHeight,
                        }}
                    />
                </div>
            </div>

            {/* Calendar Overlay */}
            {isOpen && !isDisabled && (
                <Calender
                    containerRef={containerRef}
                    isOpen={true}
                    value={value}
                    required={required}
                    minDate={minDate}
                    maxDate={maxDate}
                    disabledDates={disabledDates}
                    onChange={onChange}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
