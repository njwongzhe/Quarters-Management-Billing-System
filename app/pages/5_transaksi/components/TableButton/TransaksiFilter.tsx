"use client";

import type { RefObject } from "react";

import FilterOption from "@/app/components/Filter/FilterOption";
import type { FilterOptionSet } from "@/app/components/Filter/FilterOption";
import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";

type TransaksiFilterProps<T extends string> = {
  panelRef: RefObject<HTMLDivElement | null>;
  isActive: boolean;
  isOpen: boolean;
  optionSets: FilterOptionSet<T>[];
  onChange: (sets: FilterOptionSet<T>[]) => void;
  onToggle: () => void;
};

export default function TransaksiFilter<T extends string>({
  panelRef,
  isActive,
  isOpen,
  optionSets,
  onChange,
  onToggle,
}: TransaksiFilterProps<T>) {
  return (
    <div ref={panelRef} className="relative">
      <ToolbarIconButton
        icon={commonIcons.filter}
        label="Tapis kategori, status dan jenis transaksi"
        isActive={isOpen || isActive}
        isExpanded={isOpen}
        hasPopup="menu"
        onClick={onToggle}
      />

      {isOpen ? (
        <FilterOption<T>
          ariaLabel="Tapisan rekod transaksi"
          defaultLabel="Semua"
          optionSets={optionSets}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}