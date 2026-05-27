"use client";

import { useState } from "react";
import Icon from "../../../components/Icon"; // Ensure path matches your setup

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  categories: string[];
  statuses: string[];
  types: string[];
}

interface TransaksiFilterPanelProps {
  onSearch: (filters: FilterState) => void;
  isLoading: boolean;
  onExport: () => void;
  isExporting: boolean;
}

const STATUS_OPTIONS = [
  { value: "NORMAL", label: "NORMAL", color: "bg-[#CFFAFE] text-[#0E7490] border border-cyan-200/50" },
  { value: "DIBALIKAN", label: "DIBALIKAN", color: "bg-[#DC2626] text-white border border-[#DC2626]" },
  { value: "DILARASKAN", label: "DILARASKAN", color: "bg-[#FEF3C7] text-[#92400E] border border-amber-200/50" },
  { value: "PEMBALIKAN", label: "PEMBALIKAN", color: "bg-[#DC2626] text-white border border-[#DC2626]" },
  { value: "PELARASAN", label: "PELARASAN", color: "bg-[#FEF3C7] text-[#92400E] border border-amber-200/50" },
];

const CATEGORY_OPTIONS = [
  "BAYARAN", "CAJ_SEWA", "CAJ_PENYELENGGARAAN", "CAJ_PENALTI", "CAJ_TAMBAHAN", "REBAT", "BAKI_AWAL", "LAIN_LAIN"
];

const TYPE_OPTIONS = [
  { value: "DEBIT", label: "DEBIT", color: "bg-[#E0E7FF] text-[#4F46E5] border border-[#C7D2FE]" },
  { value: "CREDIT", label: "KREDIT", color: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]" },
];

export default function TransaksiFilterPanel({ onSearch, isLoading, onExport, isExporting }: TransaksiFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true); // Collapsible state
  
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    startDate: "",
    endDate: "",
    categories: [],
    statuses: ["NORMAL", "DIBALIKAN", "DILARASKAN", "PEMBALIKAN", "PELARASAN"], // Default all selected
    types: [],
  });

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleTypeToggle = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const handleReset = () => {
    const resetState = {
      search: "",
      startDate: "",
      endDate: "",
      categories: [],
      statuses: ["NORMAL", "DIBALIKAN", "DILARASKAN", "PEMBALIKAN", "PELARASAN"],
      types: [],
    };
    setFilters(resetState);
    onSearch(resetState); // Instantly search with reset values
  };

  return (
    <div className="bg-white p-6 border-b border-gray-100 rounded-t-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-dark-blue">Senarai Transaksi</h2>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onExport}
            disabled={isExporting || isLoading}
            className="flex items-center justify-center text-gray-500 hover:text-dark-blue p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
            title="Eksport Excel"
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5d5c8d]"></div>
            ) : (
              <Icon icon="download" size={20} />
            )}
          </button>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-[#5d5c8d] hover:bg-[#4c4b7c] text-white px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer"
          >
            <Icon icon="filter" size={18} />
            {isOpen ? "Tutup Penapis" : "Penapis"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Row 1: Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Carian (ID, Penghuni, IC, Resit)</label>
              <input 
                type="text" 
                placeholder="Cth: Ahmad Ali..." 
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                className="w-full bg-light-blue border border-transparent rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#5d5c8d] text-slate-700 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tarikh Mula</label>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-light-blue border border-transparent rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#5d5c8d] text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tarikh Tamat</label>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-light-blue border border-transparent rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#5d5c8d] text-slate-700"
              />
            </div>
          </div>

          {/* Row 2: Status, Category & Type Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
            {/* Category Filter */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Kategori Transaksi</label>
              <div className="flex flex-wrap gap-3">
                {CATEGORY_OPTIONS.map(opt => {
                  const isSelected = filters.categories.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleCategoryToggle(opt)}
                      className="flex items-center gap-2 group transition-all"
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'border-transparent bg-[#5d5c8d] text-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                        {isSelected && <Icon icon="check" size={10} className="text-white" />}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${isSelected ? 'bg-[#5d5c8d] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                        {opt.replace(/_/g, ' ')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Status Transaksi</label>
                <div className="flex flex-wrap gap-3">
                  {STATUS_OPTIONS.map(opt => {
                    const isSelected = filters.statuses.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusToggle(opt.value)}
                        className="flex items-center gap-2 group transition-all"
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'border-transparent bg-[#5d5c8d] text-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                          {isSelected && <Icon icon="check" size={10} className="text-white" />}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all uppercase ${isSelected ? opt.color : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Jenis Transaksi</label>
                <div className="flex flex-wrap gap-3">
                  {TYPE_OPTIONS.map(opt => {
                    const isSelected = filters.types.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleTypeToggle(opt.value)}
                        className="flex items-center gap-2 group transition-all"
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'border-transparent bg-[#5d5c8d] text-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                          {isSelected && <Icon icon="check" size={10} className="text-white" />}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all uppercase ${isSelected ? opt.color : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100 w-full">
            <button 
              onClick={handleReset}
              disabled={isLoading}
              className="text-sm font-semibold text-gray-500 hover:text-[#5d5c8d] transition-colors px-2"
            >
              Set Semula
            </button>
            <button 
              onClick={() => onSearch(filters)}
              disabled={isLoading}
              className="flex items-center gap-2 bg-[#5d5c8d] hover:bg-[#4d4c7d] text-white px-6 py-2.5 rounded shadow-sm font-bold transition-colors disabled:opacity-50"
            >
              <Icon icon="search" size={18} />
              {isLoading ? "Mencari..." : "Cari"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}