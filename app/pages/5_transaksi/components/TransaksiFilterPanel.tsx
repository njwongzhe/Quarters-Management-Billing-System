"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FilterOptionSet } from "@/app/components/Filter/FilterOption";

import TransaksiDownload from "./TableButton/TransaksiDownload";
import TransaksiFilter from "./TableButton/TransaksiFilter";
import TransaksiFilterDate from "./TableButton/TransaksiFilterDate";
import TransaksiSearch, { TransaksiSearchPanel } from "./TableButton/TransaksiSearch";

type TransactionStatus = "NORMAL" | "DIBALIKAN" | "DILARASKAN" | "PEMBALIKAN" | "PELARASAN";
type TransactionCategory = "BAYARAN" | "CAJ_SEWA" | "CAJ_PENYELENGGARAAN" | "CAJ_PENALTI" | "CAJ_TAMBAHAN" | "REBAT" | "BAKI_AWAL" | "LAIN_LAIN";
type TransactionType = "DEBIT" | "CREDIT";
type FilterOptionValue = TransactionCategory | TransactionStatus | TransactionType;

export interface FilterState {
  search: string;
  startDate: string;
  endDate: string;
  categories: string[];
  statuses: string[];
  types: string[];
}

type TransaksiFilterPanelProps = {
  children: ReactNode;
  filters: FilterState;
  isLoading: boolean;
  isExporting: boolean;
  onFiltersChange: (filters: FilterState) => void;
  onExport: () => void;
};

// Layout static design parameters configuration mapping arrays
const STATUS_OPTIONS: Array<{ value: TransactionStatus; label: string; dotColor: string }> = [
  { value: "NORMAL", label: "Normal", dotColor: "bg-cyan-500" },
  { value: "DIBALIKAN", label: "Dibalikkan", dotColor: "bg-red" },
  { value: "DILARASKAN", label: "Dilaraskan", dotColor: "bg-amber-500" },
  { value: "PEMBALIKAN", label: "Pembalikan", dotColor: "bg-red" },
  { value: "PELARASAN", label: "Pelarasan", dotColor: "bg-amber-500" },
];

const CATEGORY_OPTIONS: Array<{ value: TransactionCategory; label: string }> = [
  { value: "BAYARAN", label: "Bayaran" },
  { value: "CAJ_SEWA", label: "Caj Sewa" },
  { value: "CAJ_PENYELENGGARAAN", label: "Caj Penyelenggaraan" },
  { value: "CAJ_PENALTI", label: "Caj Penalti" },
  { value: "CAJ_TAMBAHAN", label: "Caj Tambahan" },
  { value: "REBAT", label: "Rebat" },
  { value: "BAKI_AWAL", label: "Baki Awal" },
  { value: "LAIN_LAIN", label: "Lain-lain" },
];

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string; dotColor: string }> = [
  { value: "DEBIT", label: "Debit", dotColor: "bg-red" },
  { value: "CREDIT", label: "Kredit", dotColor: "bg-green" },
];

export default function TransaksiFilterPanel({
  children,
  filters,
  isLoading,
  isExporting,
  onFiltersChange,
  onExport,
}: TransaksiFilterPanelProps) {
  // DOM element nodes tracker refs
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const datePanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const pendingFilterUpdateRef = useRef<number | null>(null);

  // Panel toggles states visibility mapping
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(filters.search.trim().length > 0);
  
  /** Un-debounced quick text-buffer sync for rapid type responsiveness */
  const [searchDraft, setSearchDraft] = useState(filters.search);

  // Compute lookup tables structures metrics safely
  const allStatuses = useMemo(() => STATUS_OPTIONS.map((o) => o.value), []);
  const allCategories = useMemo(() => CATEGORY_OPTIONS.map((o) => o.value), []);
  const allTypes = useMemo(() => TYPE_OPTIONS.map((o) => o.value), []);

  const optionSets: FilterOptionSet<FilterOptionValue>[] = [
    { title: "Kategori Transaksi", options: CATEGORY_OPTIONS.map((o) => ({ ...o })), selectedValues: filters.categories as TransactionCategory[] },
    { title: "Status Transaksi", options: STATUS_OPTIONS.map((o) => ({ ...o })), selectedValues: filters.statuses as TransactionStatus[] },
    { title: "Jenis Transaksi", options: TYPE_OPTIONS.map((o) => ({ ...o })), selectedValues: filters.types as TransactionType[] },
  ];

  // Derive visual indicator highlights properties safely
  const isSearchActive = filters.search.trim().length > 0;
  const isSearchPanelOpen = isSearchOpen || isSearchActive;
  const isDateActive = Boolean(filters.startDate || filters.endDate);
  const hasOptionFilterActive =
    filters.categories.length !== allCategories.length ||
    filters.types.length !== allTypes.length ||
    filters.statuses.length !== allStatuses.length;

  // Track incoming external properties mutations to force internal buffer alignment
  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  // Focus utility management effect
  useEffect(() => {
    if (isSearchPanelOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchPanelOpen]);

  // -------------------------------------------------------------------------
  // DEBOUNCER LOGIC ENGINE FOR TEXT FILTERING
  // -------------------------------------------------------------------------
  useEffect(() => {
    const normalizedDraft = searchDraft.trim();
    const normalizedActive = filters.search.trim();

    if (normalizedDraft === normalizedActive) return;

    // Wait 300ms since user stopped typing before propagating down page layout filters
    const timeoutId = window.setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchDraft,
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchDraft, filters, onFiltersChange]);

  // Cleanup timers natively on destruction routines
  useEffect(() => {
    return () => {
      if (pendingFilterUpdateRef.current !== null) {
        window.clearTimeout(pendingFilterUpdateRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // OUTSIDE PORTAL POINTER-CLICK DETECTION CONTROLLERS
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isFilterOpen && !isDateOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      // Skip closed checks if user clicked natively inside external modal date calendars portal frames
      if (target instanceof Element && target.closest("[data-filter-date-calendar]")) return;

      // Skip if user interacted directly within boundaries of the dynamic panel sheets
      if (filterPanelRef.current?.contains(target) || datePanelRef.current?.contains(target)) return;

      setIsFilterOpen(false);
      setIsDateOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isDateOpen, isFilterOpen]);

  // -------------------------------------------------------------------------
  // HANDLERS & CONTROL OPERATIONS
  // -------------------------------------------------------------------------
  function handleToggleSearch() {
    if (isSearchPanelOpen) {
      setIsSearchOpen(false);
      if (filters.search.trim().length > 0 || searchDraft.trim().length > 0) {
        setSearchDraft("");
        onFiltersChange({ ...filters, search: "" });
      }
      return;
    }
    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    if (pendingFilterUpdateRef.current !== null) {
      window.clearTimeout(pendingFilterUpdateRef.current);
    }
    setSearchDraft("");
    setIsSearchOpen(false);
    onFiltersChange({ ...filters, search: "" });
  }

  /** Schedules structural data operations safely with an incremental timing scheduler */
  function scheduleFiltersChange(nextFilters: FilterState) {
    if (pendingFilterUpdateRef.current !== null) {
      window.clearTimeout(pendingFilterUpdateRef.current);
    }

    pendingFilterUpdateRef.current = window.setTimeout(() => {
      onFiltersChange(nextFilters);
      pendingFilterUpdateRef.current = null;
    }, 180); // 180ms delay buffer for multi-select clicks stabilization
  }

  function handleFilterChange(sets: FilterOptionSet<FilterOptionValue>[]) {
    const nextCategories = (sets[0]?.selectedValues ?? []) as TransactionCategory[];
    const nextStatuses = (sets[1]?.selectedValues ?? []) as TransactionStatus[];
    const nextTypes = (sets[2]?.selectedValues ?? []) as TransactionType[];

    scheduleFiltersChange({
      ...filters,
      categories: nextCategories.length === allCategories.length ? [...allCategories] : nextCategories,
      statuses: nextStatuses.length === allStatuses.length ? [...allStatuses] : nextStatuses,
      types: nextTypes.length === allTypes.length ? [...allTypes] : nextTypes,
    });
  }

  return (
    <section className="min-h-0 flex-1 rounded-lg bg-light-blue p-1">
      <div className="flex items-start justify-between gap-4 px-3 pt-3">
        <div>
          <h2 className="text-lg font-bold text-dark-grey">Senarai Transaksi</h2>
          <p className="text-xs text-grey/70">Rekod transaksi terkini.</p>
        </div>

        <div className="flex items-center gap-4 text-[#607083]">
          <TransaksiSearch isActive={isSearchPanelOpen} onToggle={handleToggleSearch} />

          <TransaksiFilterDate
            panelRef={datePanelRef}
            isActive={isDateActive}
            isOpen={isDateOpen}
            startDate={filters.startDate}
            endDate={filters.endDate}
            onApply={(nextDate) => {
              scheduleFiltersChange({
                ...filters,
                startDate: nextDate.startDate,
                endDate: nextDate.endDate,
              });
            }}
            onClear={() => {
              scheduleFiltersChange({ ...filters, startDate: "", endDate: "" });
              setIsDateOpen(false);
            }}
            onToggle={() => {
              setIsDateOpen((v) => !v);
              setIsFilterOpen(false);
            }}
          />

          <TransaksiFilter<FilterOptionValue>
            panelRef={filterPanelRef}
            isActive={hasOptionFilterActive}
            isOpen={isFilterOpen}
            optionSets={optionSets}
            onChange={handleFilterChange}
            onToggle={() => {
              setIsFilterOpen((v) => !v);
              setIsDateOpen(false);
            }}
          />

          <TransaksiDownload disabled={isLoading || isExporting} isExporting={isExporting} onExport={onExport} />
        </div>
      </div>

      {isSearchPanelOpen ? (
        <TransaksiSearchPanel
          inputRef={searchInputRef}
          searchDraft={searchDraft}
          onChange={setSearchDraft}
          onClear={handleClearSearch}
        />
      ) : null}

      <div className="mt-3 overflow-hidden rounded-lg bg-white shadow">{children}</div>
    </section>
  );
}