"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import FilterDate from "@/app/components/Filter/FilterDate";
import FilterOption from "@/app/components/Filter/FilterOption";
import type { FilterOptionSet } from "@/app/components/Filter/FilterOption";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { InputField as SharedInputField } from "@/app/components/InputField";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";

type TransactionStatus =
  | "NORMAL"
  | "DIBALIKAN"
  | "DILARASKAN"
  | "PEMBALIKAN"
  | "PELARASAN";
type TransactionCategory =
  | "BAYARAN"
  | "CAJ_SEWA"
  | "CAJ_PENYELENGGARAAN"
  | "CAJ_PENALTI"
  | "CAJ_TAMBAHAN"
  | "REBAT"
  | "BAKI_AWAL"
  | "LAIN_LAIN";
type TransactionType = "DEBIT" | "CREDIT";
type FilterOptionValue = TransactionCategory | TransactionStatus | TransactionType;

const STATUS_OPTIONS: Array<{
  value: TransactionStatus;
  label: string;
  dotColor: string;
}> = [
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

const TYPE_OPTIONS: Array<{
  value: TransactionType;
  label: string;
  dotColor: string;
}> = [
  { value: "DEBIT", label: "Debit", dotColor: "bg-red" },
  { value: "CREDIT", label: "Kredit", dotColor: "bg-green" },
];

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

function normalizeAsStringArray(value: readonly string[]) {
  return [...value];
}

export default function TransaksiFilterPanel({
  children,
  filters,
  isLoading,
  isExporting,
  onFiltersChange,
  onExport,
}: TransaksiFilterPanelProps) {
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const datePanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(
    filters.search.trim().length > 0,
  );
  const [searchDraft, setSearchDraft] = useState(filters.search);

  const allStatuses = useMemo(
    () => STATUS_OPTIONS.map((option) => option.value),
    [],
  );
  const allCategories = useMemo(
    () => CATEGORY_OPTIONS.map((option) => option.value),
    [],
  );
  const allTypes = useMemo(() => TYPE_OPTIONS.map((option) => option.value), []);

  const selectedStatuses = filters.statuses;
  const selectedCategories = filters.categories;
  const selectedTypes = filters.types;

  const optionSets: FilterOptionSet<FilterOptionValue>[] = [
    {
      title: "Kategori Transaksi",
      options: CATEGORY_OPTIONS.map((option) => ({ ...option })),
      selectedValues: selectedCategories as TransactionCategory[],
    },
    {
      title: "Status Transaksi",
      options: STATUS_OPTIONS.map((option) => ({ ...option })),
      selectedValues: selectedStatuses as TransactionStatus[],
    },
    {
      title: "Jenis Transaksi",
      options: TYPE_OPTIONS.map((option) => ({ ...option })),
      selectedValues: selectedTypes as TransactionType[],
    },
  ];

  const isSearchActive = filters.search.trim().length > 0;
  const isSearchPanelOpen = isSearchOpen || isSearchActive;
  const isDateActive = Boolean(filters.startDate || filters.endDate);
  const hasOptionFilterActive =
    filters.categories.length > 0 ||
    filters.types.length > 0 ||
    filters.statuses.length !== allStatuses.length;

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (!isSearchPanelOpen) {
      return;
    }

    searchInputRef.current?.querySelector("input")?.focus();
  }, [isSearchPanelOpen]);

  useEffect(() => {
    const normalizedSearch = searchDraft.trim();
    const normalizedCurrentSearch = filters.search.trim();

    if (normalizedSearch === normalizedCurrentSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchDraft,
      });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters, onFiltersChange, searchDraft]);

  useEffect(() => {
    if (!isFilterOpen && !isDateOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (target instanceof Element && target.closest("[data-filter-date-calendar]")) {
        return;
      }

      if (filterPanelRef.current?.contains(target) || datePanelRef.current?.contains(target)) {
        return;
      }

      setIsFilterOpen(false);
      setIsDateOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isDateOpen, isFilterOpen]);

  function handleToggleSearch() {
    if (isSearchPanelOpen) {
      setIsSearchOpen(false);

      // Do not trigger data reload when closing search panel if value did not change.
      if (filters.search.trim().length > 0 || searchDraft.trim().length > 0) {
        setSearchDraft("");
        onFiltersChange({
          ...filters,
          search: "",
        });
      }

      return;
    }

    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    setSearchDraft("");
    setIsSearchOpen(false);
    onFiltersChange({
      ...filters,
      search: "",
    });
  }

  function handleFilterChange(sets: FilterOptionSet<FilterOptionValue>[]) {
    const nextCategories = (sets[0]?.selectedValues ?? []) as TransactionCategory[];
    const nextStatuses = (sets[1]?.selectedValues ?? []) as TransactionStatus[];
    const nextTypes = (sets[2]?.selectedValues ?? []) as TransactionType[];

    onFiltersChange({
      ...filters,
      categories:
        nextCategories.length === 0 || nextCategories.length === allCategories.length
          ? []
          : nextCategories,
      statuses:
        nextStatuses.length === allStatuses.length
          ? normalizeAsStringArray(allStatuses)
          : nextStatuses,
      types:
        nextTypes.length === allTypes.length
          ? normalizeAsStringArray(allTypes)
          : nextTypes,
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
          <ToolbarIconButton
            icon={commonIcons.search}
            label="Cari rekod transaksi"
            isActive={isSearchPanelOpen}
            onClick={handleToggleSearch}
          />

          <div ref={datePanelRef} className="relative">
            <ToolbarIconButton
              icon={commonIcons.calendar}
              label="Tapis tarikh transaksi"
              isActive={isDateOpen || isDateActive}
              onClick={() => {
                setIsDateOpen((value) => !value);
                setIsFilterOpen(false);
              }}
            />

            {isDateOpen ? (
              <FilterDate
                title="Tarikh"
                description="Pilih julat tarikh transaksi yang ingin dipaparkan."
                ariaLabel="Tapisan tarikh transaksi"
                value={{
                  startDate: filters.startDate,
                  endDate: filters.endDate,
                }}
                onApply={(nextDate) => {
                  onFiltersChange({
                    ...filters,
                    startDate: nextDate.startDate,
                    endDate: nextDate.endDate,
                  });
                }}
                onClear={() => {
                  onFiltersChange({
                    ...filters,
                    startDate: "",
                    endDate: "",
                  });
                  setIsDateOpen(false);
                }}
              />
            ) : null}
          </div>

          <div ref={filterPanelRef} className="relative">
            <ToolbarIconButton
              icon={commonIcons.filter}
              label="Tapis kategori, status dan jenis transaksi"
              isActive={isFilterOpen || hasOptionFilterActive}
              isExpanded={isFilterOpen}
              hasPopup="menu"
              onClick={() => {
                setIsFilterOpen((value) => !value);
                setIsDateOpen(false);
              }}
            />

            {isFilterOpen ? (
              <FilterOption<FilterOptionValue>
                ariaLabel="Tapisan rekod transaksi"
                defaultLabel="Semua"
                optionSets={optionSets}
                onChange={(sets) => handleFilterChange(sets)}
              />
            ) : null}
          </div>

          <ToolbarIconButton
            icon={commonIcons.download}
            label="Muat turun rekod transaksi"
            disabled={isLoading || isExporting}
            isActive={isExporting}
            onClick={onExport}
          />
        </div>
      </div>

      {isSearchPanelOpen ? (
        <div className="mt-3 px-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div ref={searchInputRef} className="flex-1">
                <SharedInputField
                  label="CARIAN REKOD TRANSAKSI"
                  value={searchDraft}
                  state="active"
                  onChange={setSearchDraft}
                  placeholder="Contoh: T-2026, Ahmad, 850212-01-1234 atau RESIT-001"
                  showLabel
                  leadingIcon={(
                    <Icon
                      icon={commonIcons.search}
                      size={18}
                      className="text-light-grey"
                    />
                  )}
                  className="w-full"
                  activeBackgroundClass="bg-light-blue"
                  inputFontSize={12}
                  inputMinHeight={40}
                />
              </div>

              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!isSearchActive}
                onClick={handleClearSearch}
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-lg bg-white shadow">{children}</div>
    </section>
  );
}
