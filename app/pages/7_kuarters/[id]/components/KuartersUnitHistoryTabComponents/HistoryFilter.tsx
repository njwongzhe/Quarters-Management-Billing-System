"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import FilterOption, {
  areAllFilterOptionsSelected,
  normalizeSelectedValuesForOptions,
  type FilterOption as FilterItemOption,
} from "@/app/components/FIlter/FilterOption";
import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";

import type { QuarterUnitOccupancyDetails } from "@/lib/quarters/quarter-units";

type HistoryFilter = QuarterUnitOccupancyDetails["status"];

type UseHistoryFilterResult = {
  filteredRecords: QuarterUnitOccupancyDetails[];
  statusFilterKey: string;
  FilterControl: React.ReactNode;
};

const HISTORY_STATUS_OPTIONS: FilterItemOption<HistoryFilter>[] = [
  { value: "CURRENT", label: "Aktif", dotColor: "bg-aktif" },
  { value: "PAST", label: "Keluar", dotColor: "bg-x-layak" },
];

const DEFAULT_STATUS_FILTER: HistoryFilter[] = HISTORY_STATUS_OPTIONS.map(
  (option) => option.value,
);

function getStatusFilterLabel(selectedStatuses: HistoryFilter[]) {
  const normalizedStatuses = normalizeSelectedValuesForOptions(
    HISTORY_STATUS_OPTIONS,
    selectedStatuses,
  );
  const isAllSelected = areAllFilterOptionsSelected(
    HISTORY_STATUS_OPTIONS,
    normalizedStatuses,
  );

  if (isAllSelected) {
    return "Semua Rekod";
  }

  if (normalizedStatuses.length === 0) {
    return "Tiada Rekod";
  }

  return normalizedStatuses
    .map((status) => (status === "CURRENT" ? "Aktif" : "Keluar"))
    .join(", ");
}

export function useHistoryFilter(
  records: QuarterUnitOccupancyDetails[],
): UseHistoryFilterResult {
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<HistoryFilter[]>(
    DEFAULT_STATUS_FILTER,
  );
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterAnchorStyle, setFilterAnchorStyle] = useState<CSSProperties>({});

  const normalizedStatusFilter = useMemo(
    () => normalizeSelectedValuesForOptions(HISTORY_STATUS_OPTIONS, statusFilter),
    [statusFilter],
  );
  const isAllStatusSelected = areAllFilterOptionsSelected(
    HISTORY_STATUS_OPTIONS,
    normalizedStatusFilter,
  );
  const hasNoStatusSelected = normalizedStatusFilter.length === 0;
  const isStatusFilterActive = !isAllStatusSelected;

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

      if (
        target instanceof Element &&
        target.closest("[data-filter-option-panel]")
      ) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest("[data-filter-option-panel]")
      ) {
        return;
      }

      setIsFilterMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isFilterMenuOpen]);

  const filteredRecords = useMemo(() => {
    if (isAllStatusSelected) {
      return records;
    }

    if (hasNoStatusSelected) {
      return [];
    }

    return records.filter((occupancy) =>
      normalizedStatusFilter.includes(occupancy.status),
    );
  }, [hasNoStatusSelected, isAllStatusSelected, normalizedStatusFilter, records]);

  const statusFilterKey = useMemo(() => normalizedStatusFilter.join("|"), [normalizedStatusFilter]);

  const FilterControl = (
    <>
      <div ref={filterMenuRef} className="relative">
        <ToolbarButton
          icon={commonIcons.filter}
          label={`Tapis sejarah penghunian: ${getStatusFilterLabel(normalizedStatusFilter)}`}
          isActive={isFilterMenuOpen || isStatusFilterActive}
          onClick={() => {
            if (!isFilterMenuOpen && filterMenuRef.current) {
              const rect = filterMenuRef.current.getBoundingClientRect();
              setFilterAnchorStyle({
                position: "fixed",
                top: rect.bottom,
                right: window.innerWidth - rect.right,
                zIndex: 9999,
              });
            }

            setIsFilterMenuOpen((currentState) => !currentState);
          }}
        />

        {isFilterMenuOpen && typeof document !== "undefined"
          ? createPortal(
              <div style={filterAnchorStyle} data-filter-option-panel>
                <FilterOption<HistoryFilter>
                  ariaLabel="Tapisan status sejarah penghunian"
                  defaultLabel="Semua Rekod"
                  optionSets={[
                    {
                      title: "Status Penghunian",
                      options: HISTORY_STATUS_OPTIONS,
                      selectedValues: normalizedStatusFilter,
                    },
                  ]}
                  onChange={(sets) => {
                    setStatusFilter(sets[0]?.selectedValues ?? []);
                  }}
                />
              </div>,
              document.body,
            )
          : null}
      </div>
    </>
  );

  return {
    filteredRecords,
    statusFilterKey,
    FilterControl,
  };
}
