"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import FilterOption from "@/app/components/FIlter/FilterOption";
import { InputField as SharedInputField } from "@/app/components/InputField";
import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import { bayaranStatusFilters } from "@/lib/payments/bayaran-constants";
import type { BayaranStatusFilter } from "@/lib/payments/bayaran-types";

type BayaranFilterShellProps = {
  children: ReactNode;
  downloadButton: ReactNode;
  filterQuery: string;
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
  statusFilter,
  onFilterQueryChange,
  onStatusFilterChange,
}: BayaranFilterShellProps) {
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(
    filterQuery.trim().length > 0,
  );
  const isSearchFilterActive = filterQuery.trim().length > 0;
  const isSearchPanelOpen = isSearchOpen || isSearchFilterActive;
  const isStatusFilterActive = statusFilter.length !== statusFilterOptions.length;
  const isFilterButtonActive =
    isFilterMenuOpen || isSearchFilterActive || isStatusFilterActive;

  useEffect(() => {
    if (isSearchPanelOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchPanelOpen]);

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

  function handleToggleSearch() {
    if (isSearchPanelOpen) {
      onFilterQueryChange("");
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    onFilterQueryChange("");
    setIsSearchOpen(false);
  }

  return (
    <div className="rounded-xl bg-light-blue p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-[#07162F]">
            Senarai Rekod Bayaran
          </h2>
          <p className="text-xs font-medium text-[#344054]">
            Rekod bayaran terkini.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ToolbarIconButton
            icon={commonIcons.search}
            label="Cari rekod bayaran"
            isActive={isSearchPanelOpen}
            onClick={handleToggleSearch}
          />
          <div ref={filterMenuRef} className="relative">
            <ToolbarIconButton
              icon={commonIcons.filter}
              label={`Tapis status bayaran: ${getStatusFilterLabel(statusFilter)}`}
              isActive={isFilterButtonActive}
              hasPopup="menu"
              isExpanded={isFilterMenuOpen}
              onClick={() => setIsFilterMenuOpen((value) => !value)}
            />

            {isFilterMenuOpen ? (
              <FilterOption
                title="Status Bayaran"
                description="Pilih rekod yang ingin dipaparkan."
                ariaLabel="Tapisan status bayaran"
                defaultLabel="Semua Status"
                options={statusFilterOptions}
                selectedValues={statusFilter}
                onSelect={onStatusFilterChange}
              />
            ) : null}
          </div>
          {downloadButton}
        </div>
      </div>

      {isSearchPanelOpen ? (
        <div className="mb-5 rounded-lg bg-white p-4 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div ref={searchInputRef} className="flex-1">
              <SharedInputField
                label="CARIAN REKOD BAYARAN"
                value={filterQuery}
                state="active"
                onChange={onFilterQueryChange}
                placeholder="Contoh: Ahmad, 850212-01-1234, Kelas A atau A-01-05"
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
              disabled={!isSearchFilterActive}
              onClick={handleClearSearch}
            >
              Kosongkan
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">{children}</div>
    </div>
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
