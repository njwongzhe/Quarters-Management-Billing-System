"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FilterOption from "@/app/components/Filter/FilterOption";
import { areAllFilterOptionsSelected } from "@/app/components/Filter/FilterOption";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import type { TunggakanFilter } from "@/lib/arrears/arrears";

type ArrearsFilterProps = {
  filters: TunggakanFilter;
  onChange: (nextFilter: TunggakanFilter) => void;
};

type ArrearsStatusFilter = "SUDAH_DIKUTIP" | "BELUM_DIKUTIP";

const STATUS_OPTIONS = [
  { value: "SUDAH_DIKUTIP", label: "Sudah Dikutip", dotColor: "bg-green" },
  { value: "BELUM_DIKUTIP", label: "Belum Dikutip", dotColor: "bg-red" },
] as const;

export default function ArrearsFilter({ filters, onChange }: ArrearsFilterProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
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

      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const activeCount = useMemo(() => {
    const allSelected = areAllFilterOptionsSelected(
      STATUS_OPTIONS.map((option) => ({ ...option })),
      filters.statusBayaranSelections as ArrearsStatusFilter[]
    );

    if (allSelected) {
      return 0;
    }

    return filters.statusBayaranSelections.length;
  }, [filters.statusBayaranSelections]);

  return (
    <div ref={panelRef} className="relative">
      <ToolbarIconButton
        icon="filter"
        label="Tapis rekod tunggakan"
        isActive={isOpen || activeCount > 0}
        hasPopup="menu"
        isExpanded={isOpen}
        onClick={() => setIsOpen((currentState) => !currentState)}
      />

      {isOpen ? (
        <FilterOption<ArrearsStatusFilter>
          ariaLabel="Tapisan rekod tunggakan"
          defaultLabel="Semua"
          optionSets={[
            {
              title: "Status Bayaran",
              options: STATUS_OPTIONS.map((option) => ({ ...option })),
              selectedValues: filters.statusBayaranSelections as ArrearsStatusFilter[],
            },
          ]}
          onChange={(sets) => {
            const statusSelections = (sets[0]?.selectedValues ?? []) as ArrearsStatusFilter[];

            const normalizedStatusBayaran =
              statusSelections.length === 1 ? statusSelections[0] : "SEMUA";

            onChange({
              ...filters,
              statusBayaranSelections: statusSelections,
              statusBayaran: normalizedStatusBayaran,
            });
          }}
        />
      ) : null}
    </div>
  );
}
