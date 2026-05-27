"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import FilterOption from "@/app/components/FIlter/FilterOption";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import {
  buildAuditLogQueryString,
  type AuditLogFilters,
} from "../auditLogClient";
import { getAuditActionDotColor } from "../auditLogActionColor";

type AuditFilterSet = {
  title: string;
  selectedValues: string[];
};

type AuditFilterProps = {
  filters: AuditLogFilters;
  options: {
    actionTypes: {
      value: string;
      label: string;
    }[];
    admins: {
      id: string;
      name: string;
    }[];
  };
};

export default function AuditFilter({ filters, options }: AuditFilterProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Build UI option groups and preselect values from current URL filters.
  const optionSets = useMemo(() => {
    return [
      {
        title: "Jenis Tindakan",
        options: options.actionTypes.map((actionType) => ({
          ...actionType,
          dotColor: getAuditActionDotColor(actionType.value),
        })),
        selectedValues: filters.actionType
          ? filters.actionType.split(",")
          : options.actionTypes.map((opt) => opt.value),
      },
    ];
  }, [filters.actionType, options.actionTypes]);

  // Convert filter panel selections back into compact URL filter values.
  function convertSetsToFilters(nextSets: AuditFilterSet[]) {
    const actionTypeValues = nextSets[0]?.selectedValues || [];

    const isAllActionTypes =
      options.actionTypes.length > 0 &&
      actionTypeValues.length === options.actionTypes.length;

    const actionType = isAllActionTypes
      ? undefined
      : actionTypeValues.length === 0
        ? "none"
        : actionTypeValues.join(",");

    return {
      ...filters,
      actionType: actionType as AuditLogFilters["actionType"],
      adminId: undefined,
    };
  }

  // Avoid unnecessary route updates when selected filters did not change.
  function applyFiltersIfChanged(nextSets: AuditFilterSet[]) {
    const nextFilters = convertSetsToFilters(nextSets);

    if (
      nextFilters.actionType === filters.actionType &&
      nextFilters.adminId === filters.adminId
    ) {
      return;
    }

    pushFilters(nextFilters);
  }

  // Close the filter panel when clicking outside of its container.
  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      setIsFilterOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isFilterOpen]);

  // Write filters into URL query params and reset to first page.
  function pushFilters(nextFilters: AuditLogFilters) {
    router.replace(
      `/pages/8_jejak_audit${buildAuditLogQueryString(nextFilters, { page: 1 })}`,
    );
  }

  // Keep callback naming explicit for FilterOption change events.
  function handleFilterChange(
    nextSets: AuditFilterSet[],
  ) {
    applyFiltersIfChanged(nextSets);
  }

  const hasAppliedFilter = Boolean(filters.actionType);
  const isFilterActive = isFilterOpen || hasAppliedFilter;

  return (
    <div ref={panelRef} className="relative">
      <ToolbarIconButton
        icon="filter"
        label="Tapis rekod audit"
        isActive={isFilterActive}
        onClick={() => {
          setIsFilterOpen((currentState) => !currentState);
        }}
      />

      {isFilterOpen ? (
        <FilterOption
          ariaLabel="Tapisan rekod audit"
          defaultLabel="Semua"
          optionSets={optionSets}
          onChange={(sets) => handleFilterChange(sets)}
        />
      ) : null}
    </div>
  );
}