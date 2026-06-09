"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import FilterOption from "@/app/components/Filter/FilterOption";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import { bayaranStatusFilters } from "@/lib/payments/bayaran-constants";
import type { BayaranStatusFilter } from "@/lib/payments/bayaran-types";
import SearchBar, { SearchBarToggleButton, useSearchBarLogic } from "@/app/components/SearchBar";

type BayaranFilterShellProps = {
  children: ReactNode;
  downloadButton: ReactNode;
  filterQuery: string;
  isLoading?: boolean;
  statusFilter: BayaranStatusFilter[];
  onFilterQueryChange: (value: string) => void;
  onStatusFilterChange: (values: BayaranStatusFilter[]) => void;
};

const statusFilterOptions = bayaranStatusFilters.map((status) => ({
  value: status.value,
  label: status.label,
  dotColor: status.dotColor,
}));

export default function BayaranFilterShell({
  children,
  downloadButton,
  filterQuery,
  isLoading = false,
  statusFilter,
  onFilterQueryChange,
  onStatusFilterChange,
}: BayaranFilterShellProps) {
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const {
    isOpen: isSearchOpen,
    isSearchActive: isSearchFilterActive,
    searchInputRef,
    handleToggleSearch,
    handleClearSearch,
  } = useSearchBarLogic({ value: filterQuery, onChange: onFilterQueryChange });

  const isStatusFilterActive = statusFilter.length !== statusFilterOptions.length;
  const isFilterButtonActive = isFilterMenuOpen || isStatusFilterActive;

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (filterMenuRef.current?.contains(target)) {
        return;
      }

      setIsFilterMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isFilterMenuOpen]);

  return (
    <section className="min-h-0 flex-1 rounded-lg bg-light-blue p-1 flex flex-col gap-3">
      <div className="flex flex-col gap-3 pt-3 px-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-dark-grey">
              Senarai Rekod Bayaran
            </h2> 
            <p className="text-xs text-grey">
              Rekod bayaran terkini.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[#607083]">
            <SearchBarToggleButton
              label="Cari rekod bayaran"
              isOpen={isSearchOpen}
              onToggle={handleToggleSearch}
            />
            <div ref={filterMenuRef} className="relative">
              <ToolbarIconButton
                icon={commonIcons.filter}
                label={`Tapis status bayaran: ${getStatusFilterLabel(statusFilter)}`}
                isActive={isFilterButtonActive}
                hasPopup="menu"
                isExpanded={isFilterMenuOpen}
                onClick={() => {
                  setIsFilterMenuOpen((value) => !value);
                }}
              />

              {isFilterMenuOpen ? (
                <FilterOption
                  ariaLabel="Tapisan status bayaran"
                  defaultLabel="Semua Status"
                  optionSets={[
                    {
                      title: "Status Bayaran",
                      options: statusFilterOptions,
                      selectedValues: statusFilter,
                    },
                  ]}
                  onChange={(sets) => onStatusFilterChange(sets[0]?.selectedValues ?? [])}
                />
              ) : null}
            </div>
            {downloadButton}
          </div>
        </div>

        {isSearchOpen ? (
          <SearchBar
            value={filterQuery}
            onChange={onFilterQueryChange}
            onClear={handleClearSearch}
            label="CARIAN REKOD BAYARAN"
            placeholder="Contoh: Ahmad, 850212-01-1234, Kelas A atau A-01-05"
            inputRef={searchInputRef}
          />
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">{children}</div>
    </section>
  );
}

function getStatusFilterLabel(statuses: BayaranStatusFilter[]) {
  if (statuses.length === statusFilterOptions.length) {
    return "Semua Status";
  }

  if (statuses.length === 0) {
    return "Tiada Status";
  }

  return statuses
    .map(
      (status) =>
        statusFilterOptions.find((option) => option.value === status)?.label ??
        status,
    )
    .join(", ");
}