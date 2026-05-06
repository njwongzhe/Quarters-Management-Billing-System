"use client";

import { useState } from "react";
import Icon from "../../../components/Icon"; // Ensure path matches your setup

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  categories: string[];
  statuses: string[];
}

interface TransaksiFilterPanelProps {
  onSearch: (filters: FilterState) => void;
  isLoading: boolean;
}

const STATUS_OPTIONS = [
  { value: "NORMAL", label: "NORMAL", color: "bg-blue-100 text-blue-700" },
  { value: "DIBATALKAN", label: "DIBATALKAN", color: "bg-red-100 text-red-700" },
  { value: "DILARASKAN", label: "DILARASKAN", color: "bg-yellow-100 text-yellow-700" },
  { value: "PEMBALIKAN", label: "PEMBALIKAN", color: "bg-red-600 text-white" },
  { value: "PELARASAN", label: "PELARASAN", color: "bg-yellow-500 text-white" },
];

const CATEGORY_OPTIONS = [
  "BAYARAN", "CAJ_SEWA", "CAJ_PENYELENGGARAAN", "CAJ_PENALTI", "CAJ_TAMBAHAN", "REBAT"
];

export default function TransaksiFilterPanel({ onSearch, isLoading }: TransaksiFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true); // Collapsible state
  
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    startDate: "",
    endDate: "",
    categories: [],
    statuses: ["NORMAL", "DIBATALKAN", "DILARASKAN", "PEMBALIKAN", "PELARASAN"], // Default all selected
  });

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const handleReset = () => {
    const resetState = {
      search: "",
      startDate: "",
      endDate: "",
      categories: [],
      statuses: ["NORMAL", "DIBATALKAN", "DILARASKAN", "PEMBALIKAN", "PELARASAN"],
    };
    setFilters(resetState);
    onSearch(resetState); // Instantly search with reset values
  };

  return (
    <div className="bg-white p-6 border-b border-gray-100 rounded-t-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-dark-blue">Senarai Transaksi</h2>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold transition-colors"
        >
          <Icon icon="filter" size={18} />
          {isOpen ? "Tutup Penapis" : "Penapis"}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Row 1: Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Carian (ID, Penghuni, IC, Resit)</label>
              <input 
                type="text" 
                placeholder="Cth: Ahmad Ali..." 
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tarikh Mula</label>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tarikh Tamat</label>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-dark-blue"
              />
            </div>
          </div>

          {/* Row 2: Status Checkboxes & Category Dropdown */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
            
            <div className="flex flex-wrap gap-3">
              {STATUS_OPTIONS.map(opt => {
                const isSelected = filters.statuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusToggle(opt.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${isSelected ? opt.color : 'bg-gray-100 text-gray-400 opacity-50'}`}
                  >
                    <div className={`w-3 h-3 rounded flex items-center justify-center border ${isSelected ? 'border-white/50' : 'border-gray-400'}`}>
                      {isSelected && <Icon icon="check" size={10} className="text-current" />}
                    </div>
                    {opt.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              <button 
                onClick={handleReset}
                disabled={isLoading}
                className="text-sm font-semibold text-gray-500 hover:text-dark-blue transition-colors px-2"
              >
                Set Semula
              </button>
              <button 
                onClick={() => onSearch(filters)}
                disabled={isLoading}
                className="flex items-center gap-2 bg-dark-blue hover:bg-blue-900 text-white px-6 py-2.5 rounded shadow-sm font-bold transition-colors disabled:opacity-50"
              >
                <Icon icon="search" size={18} />
                {isLoading ? "Mencari..." : "Cari"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}