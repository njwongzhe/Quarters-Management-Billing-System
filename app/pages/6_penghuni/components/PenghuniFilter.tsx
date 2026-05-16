"use client";

import { useState } from "react";
import Icon from "@/app/components/Icon";
import { InputField, InputFieldFormat } from "./InputField";

export type PenghuniFilterState = {
    nama: string;
    noKp: string;
    noTel: string;
    emel: string;
    statuses: {
        aktif: boolean;
        tidakLayak: boolean;
        pencenDatang: boolean;
        tidakLengkap: boolean;
        keluar: boolean;
    };
};

type PenghuniFilterProps = {
    onSearch?: (filters: PenghuniFilterState) => void;
    onReset?: () => void;
};

type CheckboxFieldProps = {
    label: string;
    borderColor: string;
    textColor: string;
    accentColor: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
};

function CheckboxField({ label, borderColor, textColor, accentColor, checked, onChange }: CheckboxFieldProps) {
    return (
        <label 
            className="flex items-center gap-2 cursor-pointer group"
            style={{ '--custom-accent': accentColor } as any}
        >
            <div className="relative flex items-center justify-center w-4 h-4">
                {/* Native Checkbox (Hidden) */}
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange?.(e.target.checked)}
                    className={`peer appearance-none m-0 w-4 h-4 border-2 ${borderColor} bg-white rounded cursor-pointer transition-colors checked:bg-(--custom-accent) checked:border-(--custom-accent)`}
                />

                {/* Custom White Checkmark */}
                <svg
                    className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>

            {/* Label Text */}
            <span className={`${textColor} text-sm font-medium tracking-wider`}>{label}</span>
        </label>
    );
}

export function PenghuniFilter({ onSearch, onReset }: PenghuniFilterProps) {
    // Filter State
    const [filterState, setFilterState] = useState<PenghuniFilterState>({
        nama: "",
        noKp: "",
        noTel: "",
        emel: "",
        statuses: {
            aktif: true,
            tidakLayak: true,
            pencenDatang: true,
            tidakLengkap: true,
            keluar: true,
        },
    });

    // Handlers for Search and Reset
    function handleSearch() {
        onSearch?.(filterState);
    }

    // Reset filter state to default values and call onReset callback.
    function handleReset() {
        const resetState: PenghuniFilterState = {
            nama: "",
            noKp: "",
            noTel: "",
            emel: "",
            statuses: {
                aktif: true,
                tidakLayak: true,
                pencenDatang: true,
                tidakLengkap: true,
                keluar: true,
            },
        };
        setFilterState(resetState);
        onReset?.();
    }

    return (
        <div className="relative p-4 bg-white rounded-lg shadow">
            {/* Arrow Pointing to the Filter Button */}
            <div className="absolute bg-white right-8.5 -top-2 w-4 h-4 rotate-45"></div>

            <div className="flex flex-col gap-6">
                {/* Filter Content */}
                <div className="grid grid-cols-4 gap-x-4 gap-y-6">
                    <InputField
                        label="NAMA"
                        value={filterState.nama}
                        onChange={(value) => setFilterState(prev => ({ ...prev, nama: value }))}
                        state="active"
                        placeholder="Cth: Ahmad Zaki"
                        inputFontSize={12}
                        inputMinHeight={40}
                        activeBackgroundClass="bg-light-blue"
                    />
                    <InputFieldFormat
                        label="NO.K/P"
                        format="######-##-####"
                        value={filterState.noKp}
                        onChange={(value) => setFilterState(prev => ({ ...prev, noKp: value }))}
                        state="active"
                        placeholder="Cth: XXXXXX-XX-XXXX"
                        inputFontSize={12}
                        inputMinHeight={40}
                        activeBackgroundClass="bg-light-blue"
                    />
                    <InputFieldFormat 
                        label="NO. TEL"
                        format="###-#### ####"
                        value={filterState.noTel}
                        onChange={(value) => setFilterState(prev => ({ ...prev, noTel: value }))}
                        state="active"
                        placeholder="Cth: 012-3456789"
                        inputFontSize={12}
                        inputMinHeight={40}
                        activeBackgroundClass="bg-light-blue"
                    />
                    <InputField
                        label="EMEL"
                        value={filterState.emel}
                        onChange={(value) => setFilterState(prev => ({ ...prev, emel: value }))}
                        state="active"
                        placeholder="Cth: example@email.com"
                        inputFontSize={12}
                        inputMinHeight={40}
                        activeBackgroundClass="bg-light-blue"
                    />
                    
                    {/* Checkboxes */}
                    <div className="col-span-4 flex flex-row justify-between gap-2">
                        <div className="flex flex-row gap-4">
                            <CheckboxField
                                label="Aktif"
                                borderColor="border-aktif"
                                textColor="text-black"
                                accentColor="var(--color-aktif)"
                                checked={filterState.statuses.aktif}
                                onChange={(checked) => setFilterState(prev => ({ ...prev, statuses: { ...prev.statuses, aktif: checked } }))}
                            />
                            <CheckboxField
                                label="Tidak Layak"
                                borderColor="border-x-layak"
                                textColor="text-black"
                                accentColor="var(--color-x-layak)"
                                checked={filterState.statuses.tidakLayak}
                                onChange={(checked) => setFilterState(prev => ({ ...prev, statuses: { ...prev.statuses, tidakLayak: checked } }))}
                            />
                            <CheckboxField
                                label="Pencen Mendatang"
                                borderColor="border-pencen-datang"
                                textColor="text-black"
                                accentColor="var(--color-pencen-datang)"
                                checked={filterState.statuses.pencenDatang}
                                onChange={(checked) => setFilterState(prev => ({ ...prev, statuses: { ...prev.statuses, pencenDatang: checked } }))}
                            />
                            <CheckboxField
                                label="Tidak Lengkap"
                                borderColor="border-x-lengkap"
                                textColor="text-black"
                                accentColor="var(--color-x-lengkap)"
                                checked={filterState.statuses.tidakLengkap}
                                onChange={(checked) => setFilterState(prev => ({ ...prev, statuses: { ...prev.statuses, tidakLengkap: checked } }))}
                            />
                        </div>

                        <div className="flex flex-row gap-4">
                            {/* Reset Button */}
                            <button 
                                onClick={handleReset}
                                className="font-semibold text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Set Semula
                            </button>

                            {/* Search Button */}
                            <button 
                                onClick={handleSearch}
                                className="font-bold text-sm flex items-center gap-1 bg-dark-blue text-white px-6 py-2 rounded hover:opacity-90 transition-opacity"
                            >
                                <Icon icon="search" size={20} />
                                Cari
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
