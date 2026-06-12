"use client";

import { useEffect, useRef, useState } from "react";

import FilterOption, {
  areAllFilterOptionsSelected,
  normalizeSelectedValuesForOptions,
  type FilterOption as FilterItemOption,
} from "@/app/components/Filter/FilterOption";
import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import type { ResidentRecord } from "@/lib/residents/resident-list";

export type PenghuniStatusFilter =
  | "AKTIF"
  | "TIDAK_LAYAK"
  | "PENCEN_MENDATANG"
  | "DATA_TIDAK_LENGKAP";

export type PenghuniFilterState = {
  nama: string;
  noKp: string;
  noTel: string;
  emel: string;
  statuses: {
    aktif: boolean;
    tidakLayak: boolean;
    pencenDatang: boolean;
    tidakLengkap: boolean;
  };
};

export const DEFAULT_PENGHUNI_STATUS_FILTERS: PenghuniStatusFilter[] = [
  "AKTIF",
  "TIDAK_LAYAK",
  "PENCEN_MENDATANG",
  "DATA_TIDAK_LENGKAP",
];

const STATUS_LABELS: Record<PenghuniStatusFilter, string> = {
  AKTIF: "Aktif",
  TIDAK_LAYAK: "Tidak Layak",
  PENCEN_MENDATANG: "Pencen Mendatang",
  DATA_TIDAK_LENGKAP: "Tidak Lengkap",
};

const STATUS_FILTER_OPTIONS: FilterItemOption<PenghuniStatusFilter>[] = [
  { value: "AKTIF", label: "Aktif", dotColor: "bg-aktif" },
  { value: "TIDAK_LAYAK", label: "Tidak Layak", dotColor: "bg-x-layak" },
  { value: "PENCEN_MENDATANG", label: "Pencen Mendatang", dotColor: "bg-pencen-datang" },
  { value: "DATA_TIDAK_LENGKAP", label: "Tidak Lengkap", dotColor: "bg-x-lengkap" },
];

export function filterResidentsByStatus(
  residents: ResidentRecord[],
  selectedValues: PenghuniStatusFilter[],
): ResidentRecord[] {
  return residents.filter((resident) =>
    selectedValues.includes(resident.status as PenghuniStatusFilter)
  );
}

function getStatusFilterLabel(statuses: PenghuniStatusFilter[]) {
  const normalizedStatuses = normalizeSelectedValuesForOptions(
    STATUS_FILTER_OPTIONS,
    statuses,
  );
  const isAllSelected = areAllFilterOptionsSelected(
    STATUS_FILTER_OPTIONS,
    normalizedStatuses,
  );

  if (isAllSelected) {
    return "Semua Status";
  }

  if (normalizedStatuses.length === 0) {
    return "Tiada Status";
  }

  return normalizedStatuses.map((status) => STATUS_LABELS[status]).join(", ");
}

type PenghuniFilterProps = {
  selectedValues: PenghuniStatusFilter[];
  onSelect: (values: PenghuniStatusFilter[]) => void;
};

export default function PenghuniFilter({
  selectedValues,
  onSelect,
}: PenghuniFilterProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isStatusFilterActive = !areAllFilterOptionsSelected(
    STATUS_FILTER_OPTIONS,
    selectedValues,
  );
  const isActive = isOpen || isStatusFilterActive;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <ToolbarIconButton
        icon={commonIcons.filter}
        label={`Tapis status penghuni: ${getStatusFilterLabel(selectedValues)}`}
        isActive={isActive}
        hasPopup="menu"
        isExpanded={isOpen}
        onClick={() => setIsOpen((currentState) => !currentState)}
      />

      {isOpen ? (
        <FilterOption<PenghuniStatusFilter>
          ariaLabel="Tapisan status penghuni"
          defaultLabel="Semua Status"
          optionSets={[
            {
              title: "Status Penghuni",
              options: STATUS_FILTER_OPTIONS,
              selectedValues: selectedValues,
            },
          ]}
          onChange={(sets) => {onSelect(sets[0]?.selectedValues ?? [])}}
        />
      ) : null}
    </div>
  );
}
