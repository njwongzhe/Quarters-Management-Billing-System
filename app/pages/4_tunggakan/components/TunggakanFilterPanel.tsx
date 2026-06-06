"use client";

import { useMemo } from "react";
import Icon from "../../../components/Icon/Icon";
import type { TunggakanListItem, TunggakanFilter } from "@/lib/arrears/arrears";

export type { TunggakanFilter };
export { defaultFilter } from "@/lib/arrears/arrears";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-4 bg-dark-blue rounded-full" />
      <h3 className="font-bold text-dark-blue text-xs uppercase tracking-wider">{label}</h3>
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            value === opt.value
              ? "bg-dark-blue text-white border-dark-blue"
              : "bg-white text-grey border-light-grey/25 hover:border-dark-blue hover:text-dark-blue"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MultiChipSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  if (options.length === 0)
    return <p className="text-xs text-light-grey italic">Tiada data tersedia</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            value.includes(opt)
              ? "bg-dark-blue text-white border-dark-blue"
              : "bg-white text-grey border-light-grey/25 hover:border-dark-blue hover:text-dark-blue"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
          enabled ? "bg-dark-blue" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
            enabled ? "left-5" : "left-0.5"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-dark-grey">{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: TunggakanListItem[];
  filters: TunggakanFilter;
  onChange: (filters: TunggakanFilter) => void;
  onClear: () => void;
  activeCount: number;
};

export default function TunggakanFilterPanel({
  isOpen,
  onClose,
  data,
  filters,
  onChange,
  onClear,
  activeCount,
}: Props) {
  const set = <K extends keyof TunggakanFilter>(key: K, value: TunggakanFilter[K]) =>
    onChange({ ...filters, [key]: value });

  // Derive unique options dynamically from data
  const kelasList = useMemo(() => {
    const s = new Set(data.map((d) => d.quarterClass).filter(Boolean));
    return Array.from(s).sort();
  }, [data]);

  const blokList = useMemo(() => {
    const s = new Set(
      data
        .map((d) => d.unitCode?.split("-")[0]?.trim() ?? "")
        .filter(Boolean)
    );
    return Array.from(s).sort();
  }, [data]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 h-full w-105 z-50 flex flex-col bg-light-blue shadow-2xl border-l border-light-grey/20">

        {/* Header */}
        <div className="bg-dark-blue px-6 py-5 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-base font-bold uppercase tracking-wide">Penapis Senarai</h2>
            <p className="text-[10px] font-semibold text-blue-200 mt-1 uppercase tracking-widest">
              {activeCount > 0 ? `${activeCount} Penapis Aktif` : "Tiada Penapis Aktif"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={onClear}
                className="text-xs font-bold text-blue-200 hover:text-white border border-blue-400 hover:border-white px-3 py-1.5 rounded transition-colors"
              >
                Kosongkan Semua
              </button>
            )}
            <button
              onClick={onClose}
              className="hover:bg-white/10 p-1 rounded transition-colors"
            >
              <Icon icon="close" size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* 1. Geografi & Hartanah */}
          <section>
            <SectionHeader label="Geografi & Hartanah" />
            <div className="space-y-5 pl-4">

              <div>
                <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-2">
                  Kategori Kuarters (Kelas)
                </label>
                <MultiChipSelect
                  options={kelasList}
                  value={filters.kelasKuarters}
                  onChange={(v) => set("kelasKuarters", v)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-2">
                  Blok / Lokasi
                </label>
                <MultiChipSelect
                  options={blokList}
                  value={filters.blok}
                  onChange={(v) => set("blok", v)}
                />
              </div>

              
            </div>
          </section>

          <hr className="border-light-grey/20" />

          {/* 2. Kewangan & Hutang */}
          <section>
            <SectionHeader label="Kewangan & Hutang" />
            <div className="space-y-5 pl-4">

              <div>
                <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-2">
                  Julat Tunggakan (RM)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-light-grey font-bold">RM</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Min"
                      value={filters.julatMin}
                      onChange={(e) => set("julatMin", e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-light-grey/25 rounded text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue bg-white"
                    />
                  </div>
                  <span className="text-grey text-sm font-bold shrink-0">—</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-light-grey font-bold">RM</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Max"
                      value={filters.julatMax}
                      onChange={(e) => set("julatMax", e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-light-grey/25 rounded text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-grey uppercase tracking-wider mb-2">
                  Status Bayaran
                </label>
                <RadioGroup
                  value={filters.statusBayaran}
                  onChange={(v) => set("statusBayaran", v)}
                  options={[
                    { label: "Semua", value: "SEMUA" },
                    { label: "Tiada Bayaran", value: "TIADA" },
                    { label: "Bayaran Separa", value: "SEPARA" },
                  ]}
                />
              </div>
            </div>
          </section>

          

          <hr className="border-light-grey/20" />

          {/* 4. Penapis Tindakan */}
          <section>
            <SectionHeader label="Penapis Tindakan" />
            <div className="space-y-4 pl-4">
              <Toggle
                enabled={filters.mempunyaiPenalti}
                onToggle={() => set("mempunyaiPenalti", !filters.mempunyaiPenalti)}
                label="Hanya rekod dengan Penalti"
              />
              <Toggle
                enabled={filters.mempunyaiRebat}
                onToggle={() => set("mempunyaiRebat", !filters.mempunyaiRebat)}
                label="Hanya rekod dengan Rebat"
              />
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-light-grey/20 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-dark-blue text-white py-3 rounded-lg font-bold text-sm hover:bg-opacity-90 transition-colors"
          >
            <Icon icon="filter" size={18} />
            Papar Keputusan
            {activeCount > 0 && (
              <span className="ml-2 bg-white text-dark-blue text-xs font-bold px-2 py-0.5 rounded-full">
                {activeCount} aktif
              </span>
            )}
          </button>
        </div>

      </div>
    </>
  );
}