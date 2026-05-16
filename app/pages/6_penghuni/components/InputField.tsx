"use client";

import Icon from "@/app/components/Icon";
import { PatternFormat } from 'react-number-format';
import { useState } from "react";

type FieldState = "active" | "inactive";

type BaseFieldStyleProps = {
    className?: string;
    labelFontSize?: number | string;
    inputFontSize?: number | string;
    inputMinHeight?: number | string;
    placeholder?: string;
    activeBackgroundClass?: string;
    inactiveBackgroundClass?: string;
    error?: boolean;
    errorMessage?: string;
};

// Topic section header component for grouping related form fields.
export function Topic({ content, className }: { content: string, className?: string }) {
    return (
        <span className={`border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest ${className || ""}`}>{content}</span>
    );
}

// Reusable input field component with customizable styling and state management.
export function InputField({
    label,
    value,
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    placeholder = "",
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
    error = false, 
    errorMessage = ""
}: {
    label: string;
    value: string;
    state: FieldState;
    onChange?: (value: string) => void;
} & BaseFieldStyleProps) {
    const isDisabled = state === "inactive";

    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            <input
                type="text"
                value={value}
                disabled={isDisabled}
                onChange={(e) => onChange && onChange(e.target.value)}
                placeholder={placeholder}
                className={`rounded-md p-3 text-sm min-h-12 border outline-none ${error ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                    ${state === "active" ? activeBackgroundClass : inactiveBackgroundClass
                }`}
                style={{
                    fontSize: inputFontSize,
                    minHeight: inputMinHeight,
                }}
            />
            {error && errorMessage && (
                <p className="text-red text-xs pl-1">{errorMessage}</p>
            )}
        </div>
    );
}

// Reusable input field component with formatting capabilities (e.g., for phone numbers, IC numbers, etc.).
export function InputFieldFormat({
    label,
    format,
    value,
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    placeholder = "",
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
    error = false, 
    errorMessage = ""
}: {
    label: string;
    format: string;
    value: string;
    state: FieldState;
    onChange?: (value: string) => void;
} & BaseFieldStyleProps) {
    const showError = !!error;
    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            {state === "inactive" && typeof value === "string" && /[^0-9]/.test(value) ? (
                <input
                    type="text"
                    value={value}
                    disabled
                    placeholder={placeholder}
                    className={`rounded-md p-3 text-sm min-h-12 border outline-none ${showError ? 'border-red focus-within:border-red' : 'border border-light-grey/40'} ${inactiveBackgroundClass}`}
                    style={{ fontSize: inputFontSize, minHeight: inputMinHeight }}
                />
            ) : (
                <PatternFormat
                    format={format}
                    value={value}
                    disabled={state === "inactive"}
                    onValueChange={(values) => onChange && onChange(values.value)}
                    placeholder={placeholder}
                    className={`rounded-md p-3 text-sm min-h-12 border outline-none ${showError ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                        ${state === "active" ? activeBackgroundClass : inactiveBackgroundClass
                    }`}
                    style={{
                        fontSize: inputFontSize,
                        minHeight: inputMinHeight,
                    }}
                />
            )}
            {showError && errorMessage && (
                <p className="text-red text-xs pl-1">{errorMessage}</p>
            )}
        </div>
    );
}

// Reusable textarea field component for longer text inputs, with customizable styling and state management.
export function InputBox({
    label,
    value,
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    placeholder = "",
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
    error = false, 
    errorMessage = ""
}: {
    label: string;
    value: string;
    state: FieldState;
    onChange?: (value: string) => void;
} & BaseFieldStyleProps) {
    const showError = !!error;
    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            <textarea
                value={value}
                disabled={state === "inactive"}
                onChange={(e) => onChange && onChange(e.target.value)}
                placeholder={placeholder}
                className={`rounded-md p-3 text-sm min-h-24 border outline-none ${showError ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                    ${state === "active" ? activeBackgroundClass : inactiveBackgroundClass
                }`}
                style={{
                    fontSize: inputFontSize,
                    minHeight: inputMinHeight,
                }}
            />
            {showError && errorMessage && (
                <p className="text-red text-xs pl-1">{errorMessage}</p>
            )}
        </div>
    );
}

// Reusable dropdown field component with customizable styling, options and state management.
export type DropdownOption = {
    label: string;
    color?: string; // e.g., "text-aktif", "text-x-layak", etc.
};

// Reusable dropdown field component with customizable styling, options and state management.
export function DropdownField({
    label,
    options,
    value,
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    placeholder = "",
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
    error = false, 
    errorMessage = ""
}: {
    label: string;
    options: (string | DropdownOption)[];
    value: string;
    state: FieldState;
    onChange?: (value: string) => void;
} & BaseFieldStyleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const showError = !!error;
    
    const normalizedOptions = options.map(opt => 
        typeof opt === 'string' ? { label: opt } : opt
    );

    const selectedOption = normalizedOptions.find(opt => opt.label === value);

    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            <div className="relative">
                {/* Dropdown Button */}
                <button
                    onClick={() => state === "active" && setIsOpen(!isOpen)}
                    disabled={state === "inactive"}
                    className={`flex flex-row items-center justify-between w-full rounded-md p-3 text-sm text-left min-h-12
                        ${showError ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                        ${state === "active" ? `${activeBackgroundClass} cursor-pointer` : `${inactiveBackgroundClass} cursor-not-allowed`}
                    `}
                    style={{
                        fontSize: inputFontSize,
                        minHeight: inputMinHeight,
                    }}
                >
                    {/* Selected Value */}
                    <span className={selectedOption?.color || (!value ? "text-grey/40" : "")}>{value || placeholder}</span>

                    {/* Custom Icon */}
                    {state === "active" && (
                        <div className={`flex items-center justify-center text-grey/40 duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                            <Icon icon="chevronDown" size={16} />
                        </div>
                    )}
                </button>
                {showError && errorMessage && (
                    <p className="text-red text-xs pl-1">{errorMessage}</p>
                )}

                {/* Dropdown Menu */}
                {isOpen && state === "active" && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-light-grey/40 rounded-md shadow-lg z-50 overflow-hidden">
                        {normalizedOptions.map((option, index) => (
                            <button
                                key={option.label}
                                onClick={() => {
                                    onChange?.(option.label);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full p-3 text-left text-sm hover:bg-light-blue transition-colors
                                    ${option.label === value ? 'bg-light-blue' : ''}
                                    ${index !== normalizedOptions.length - 1 ? 'border-b border-b-light-grey/20' : ''}
                                    ${option.color || 'text-dark-blue'}
                                `}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
