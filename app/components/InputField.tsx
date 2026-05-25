"use client";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { PatternFormat } from 'react-number-format';
import { useState, type ReactNode } from "react";

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
    showLabel?: boolean;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
};

type TableInputFieldAlign = "start" | "center" | "end";

// Topic section header component for grouping related form fields.
export function Topic({ content, className }: { content: string, className?: string }) {
    return (
        <span className={`border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest ${className || ""}`}>{content}</span>
    );
}

// Action button used in input fields for actions like "Profile Penuh", etc.
export function InputFieldActionButton({
    label,
    onClick,
    showChevron = false,
    isPrimary = false,
    disabled = false,
}: {
    label: string;
    onClick?: () => void;
    showChevron?: boolean;
    isPrimary?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-center">
            <button
                type="button"
                disabled={disabled || !onClick}
                className={`inline-flex gap-1 rounded-xl py-2 text-[11px] font-bold uppercase transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isPrimary
                        ? "bg-dark-blue px-3 text-white hover:opacity-90"
                        : "text-dark-blue hover:underline"
                }`}
                onClick={onClick}
            >
                {label}
            </button>
            {showChevron ? (
                <Icon icon={commonIcons.chevronRight} size={18} />
            ) : null}
        </div>
    );
}

// Compact input field used in editable table cells.
export function TableInputField({
    value,
    placeholder = "",
    align = "center",
    inputMode = "text",
    disabled = false,
    onChange,
}: {
    value: string;
    placeholder?: string;
    align?: TableInputFieldAlign;
    inputMode?: "decimal" | "text";
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <input
            type="text"
            inputMode={inputMode}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={`min-h-9 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-sm font-semibold text-dark-blue outline-none transition-colors placeholder:text-light-grey focus:border-dark-blue ${
                align === "start"
                    ? "w-full min-w-35 text-left"
                    : align === "end"
                        ? "w-full min-w-32 text-right"
                        : "w-full min-w-32 text-center"
            } disabled:cursor-not-allowed disabled:bg-background`}
        />
    );
}

// Compact picker-like field used in editable table cells.
export function TablePickerField({
    value,
    placeholder = "",
    disabled = false,
    align = "center",
    onClick,
}: {
    value: string;
    placeholder?: string;
    disabled?: boolean;
    align?: TableInputFieldAlign;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            className={`flex w-full items-center justify-between gap-3 rounded-xl border border-light-grey/35 bg-white px-4 py-2 text-left text-sm font-semibold text-dark-blue outline-none transition-colors hover:border-dark-blue disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60 ${
                align === "start"
                    ? "text-left"
                    : align === "end"
                        ? "text-right"
                        : "text-center"
            }`}
            aria-haspopup="dialog"
            onClick={onClick}
        >
            <span className={value ? "text-dark-blue" : "text-light-grey"}>
                {value || placeholder}
            </span>
            <Icon icon={commonIcons.search} size={18} className="text-light-grey" />
        </button>
    );
}

// Reusable input field component with customizable styling and state management.
export function InputField({
    label,
    showLabel = true,
    value,
    placeholder = "",
    type = "text",
    required = false,
    leadingIcon,
    trailingIcon,
    error = false, 
    errorMessage = "",
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
}: {
    label: string;
    value: string;
    state: FieldState;
    type?: React.HTMLInputTypeAttribute;
    required?: boolean;
    onChange?: (value: string) => void;
} & BaseFieldStyleProps) {
    const isDisabled = state === "inactive";

    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            {showLabel && (
                <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            )}
            <div className="relative flex items-center">
                {leadingIcon && (
                    <div className="absolute left-3 flex items-center text-gray-400 pointer-events-none">
                        {leadingIcon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    disabled={isDisabled}
                    required={required}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full rounded-md text-sm min-h-12 border outline-none
                        ${leadingIcon ? 'pl-9' : 'pl-3'} ${trailingIcon ? 'pr-9' : 'pr-3'} py-3
                        ${error ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                        ${state === "active" ? activeBackgroundClass : inactiveBackgroundClass}`}
                    style={{
                        fontSize: inputFontSize,
                        minHeight: inputMinHeight,
                    }}
                />
                {trailingIcon && (
                    <div className="absolute right-3 flex items-center text-gray-400 pointer-events-none">
                        {trailingIcon}
                    </div>
                )}
            </div>
            {error && errorMessage && (
                <p className="text-red text-xs pl-1">{errorMessage}</p>
            )}
        </div>
    );
}

// Reusable password input with visibility toggle (eye icon) matching authentication pages.
export function InputFieldPassword({
    label,
    showLabel = true,
    value,
    placeholder = "",
    required = false,
    leadingIcon,
    error = false,
    errorMessage = "",
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent",
    toggleButtonClassName = "text-grey",
}: {
    label: string;
    value: string;
    state: FieldState;
    required?: boolean;
    onChange?: (value: string) => void;
    toggleButtonClassName?: string;
} & Omit<BaseFieldStyleProps, "trailingIcon">) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isDisabled = state === "inactive";

    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            {showLabel && (
                <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            )}
            <div className="relative flex items-center">
                {leadingIcon && (
                    <div className="absolute left-3 flex items-center text-gray-400 pointer-events-none">
                        {leadingIcon}
                    </div>
                )}
                <input
                    type={isPasswordVisible ? "text" : "password"}
                    value={value}
                    disabled={isDisabled}
                    required={required}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full rounded-md text-sm min-h-12 border outline-none
                        ${leadingIcon ? 'pl-9' : 'pl-3'} pr-10 py-3
                        ${error ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                        ${state === "active" ? activeBackgroundClass : inactiveBackgroundClass}`}
                    style={{
                        fontSize: inputFontSize,
                        minHeight: inputMinHeight,
                    }}
                />
                <button
                    type="button"
                    disabled={isDisabled}
                    aria-label={isPasswordVisible ? "Sembunyikan kata laluan" : "Papar kata laluan"}
                    className={`absolute right-3 flex items-center ${toggleButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={() => setIsPasswordVisible((value) => !value)}
                >
                    <Icon icon={isPasswordVisible ? "visibility" : "visibility_off"} />
                </button>
            </div>
            {error && errorMessage && (
                <p className="text-red text-xs pl-1">{errorMessage}</p>
            )}
        </div>
    );
}

// Reusable input field component with formatting capabilities (e.g., for phone numbers, IC numbers, etc.).
export function InputFieldFormat({
    label,
    showLabel = true,
    format,
    value,
    placeholder = "",
    leadingIcon,
    trailingIcon,
    error = false, 
    errorMessage = "",
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
}: {
    label: string;
    format: string;
    value: string;
    state: FieldState;
    onChange?: (value: string) => void;
} & BaseFieldStyleProps) {
    const showError = !!error;
    const inputClass = `w-full rounded-md text-sm min-h-12 border outline-none
        ${leadingIcon ? 'pl-9' : 'pl-3'} ${trailingIcon ? 'pr-9' : 'pr-3'} py-3
        ${showError ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}`;
    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            {showLabel && (
                <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            )}
            <div className="relative flex items-center">
                {leadingIcon && (
                    <div className="absolute left-3 flex items-center text-gray-400 pointer-events-none">
                        {leadingIcon}
                    </div>
                )}
                {state === "inactive" && typeof value === "string" && /[^0-9]/.test(value) ? (
                    <input
                        type="text"
                        value={value}
                        disabled
                        placeholder={placeholder}
                        className={`${inputClass} ${inactiveBackgroundClass}`}
                        style={{ fontSize: inputFontSize, minHeight: inputMinHeight }}
                    />
                ) : (
                    <PatternFormat
                        format={format}
                        value={value}
                        disabled={state === "inactive"}
                        onValueChange={(values) => onChange && onChange(values.value)}
                        placeholder={placeholder}
                        className={`${inputClass} ${state === "active" ? activeBackgroundClass : inactiveBackgroundClass}`}
                        style={{
                            fontSize: inputFontSize,
                            minHeight: inputMinHeight,
                        }}
                    />
                )}
                {trailingIcon && (
                    <div className="absolute right-3 flex items-center text-gray-400 pointer-events-none">
                        {trailingIcon}
                    </div>
                )}
            </div>
            {showError && errorMessage && (
                <p className="text-red text-xs pl-1">{errorMessage}</p>
            )}
        </div>
    );
}

// Reusable textarea field component for longer text inputs, with customizable styling and state management.
export function InputBox({
    label,
    showLabel = true,
    value,
    placeholder = "",
    leadingIcon,
    trailingIcon,
    error = false, 
    errorMessage = "",
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
}: {
    label: string;
    value: string;
    state: FieldState;
    onChange?: (value: string) => void;
} & BaseFieldStyleProps) {
    const showError = !!error;
    return (
        <div className={`flex flex-col gap-2 tracking-widest ${className || ""}`}>
            {showLabel && (
                <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            )}
            <div className="relative">
                {leadingIcon && (
                    <div className="absolute left-3 top-3 flex items-center text-gray-400 pointer-events-none">
                        {leadingIcon}
                    </div>
                )}
                <textarea
                    value={value}
                    disabled={state === "inactive"}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full rounded-md text-sm min-h-24 border outline-none
                        ${leadingIcon ? 'pl-9' : 'pl-3'} ${trailingIcon ? 'pr-9' : 'pr-3'} py-3
                        ${showError ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                        ${state === "active" ? activeBackgroundClass : inactiveBackgroundClass}`}
                    style={{
                        fontSize: inputFontSize,
                        minHeight: inputMinHeight,
                    }}
                />
                {trailingIcon && (
                    <div className="absolute right-3 top-3 flex items-center text-gray-400 pointer-events-none">
                        {trailingIcon}
                    </div>
                )}
            </div>
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
    placeholder = "",
    leadingIcon,
    trailingIcon,
    error = false, 
    errorMessage = "",
    showLabel = true,
    state,
    onChange,
    className,
    labelFontSize = 10,
    inputFontSize,
    inputMinHeight,
    activeBackgroundClass = "bg-white",
    inactiveBackgroundClass = "bg-transparent", 
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
            {showLabel && (
                <label className="font-bold text-gray-500 pl-1" style={{ fontSize: labelFontSize }}>{label}</label>
            )}
            <div className="relative">
                {/* Dropdown Button */}
                <button
                    onClick={() => state === "active" && setIsOpen(!isOpen)}
                    disabled={state === "inactive"}
                    className={`flex flex-row items-center justify-between w-full rounded-md text-sm text-left min-h-12
                        ${leadingIcon ? 'pl-9' : 'pl-3'} pr-3 py-3
                        ${showError ? 'border-red focus-within:border-red' : 'border border-light-grey/40'}
                        ${state === "active" ? `${activeBackgroundClass} cursor-pointer` : `${inactiveBackgroundClass} cursor-not-allowed`}
                    `}
                    style={{
                        fontSize: inputFontSize,
                        minHeight: inputMinHeight,
                    }}
                >
                    {/* Leading Icon */}
                    {leadingIcon && (
                        <div className="absolute left-3 flex items-center text-gray-400 pointer-events-none">
                            {leadingIcon}
                        </div>
                    )}

                    {/* Selected Value */}
                    <span className={selectedOption?.color || (!value ? "text-grey/40" : "")}>{value || placeholder}</span>

                    {/* Trailing Icon + Chevron */}
                    <div className="flex items-center gap-1">
                        {trailingIcon && (
                            <div className="flex items-center text-gray-400">
                                {trailingIcon}
                            </div>
                        )}
                        {state === "active" && (
                            <div className={`flex items-center justify-center text-grey/40 duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                                <Icon icon="chevronDown" size={16} />
                            </div>
                        )}
                    </div>
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
