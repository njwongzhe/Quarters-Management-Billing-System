"use client";

import type { RefObject } from "react";

import FilterDate from "@/app/components/Filter/FilterDate";
import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";

type TransaksiFilterDateProps = {
  panelRef: RefObject<HTMLDivElement | null>;
  isActive: boolean;
  isOpen: boolean;
  startDate: string;
  endDate: string;
  onApply: (nextDate: { startDate: string; endDate: string }) => void;
  onClear: () => void;
  onToggle: () => void;
};

export default function TransaksiFilterDate({
  panelRef,
  isActive,
  isOpen,
  startDate,
  endDate,
  onApply,
  onClear,
  onToggle,
}: TransaksiFilterDateProps) {
  return (
    <div ref={panelRef} className="relative">
      <ToolbarIconButton
        icon={commonIcons.calendar}
        label="Tapis tarikh transaksi"
        isActive={isOpen || isActive}
        onClick={onToggle}
      />

      {isOpen ? (
        <FilterDate
          title="Tarikh"
          description="Pilih julat tarikh transaksi yang ingin dipaparkan."
          ariaLabel="Tapisan tarikh transaksi"
          value={{
            startDate,
            endDate,
          }}
          onApply={onApply}
          onClear={onClear}
        />
      ) : null}
    </div>
  );
}