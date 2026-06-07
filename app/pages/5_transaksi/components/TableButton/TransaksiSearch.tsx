"use client";

import type { RefObject } from "react";

import Icon, { commonIcons } from "@/app/components/Icon/Icon";
import { InputField as SharedInputField } from "@/app/components/InputField";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";

type TransaksiSearchProps = {
  isActive: boolean;
  onToggle: () => void;
};

type TransaksiSearchPanelProps = {
  inputRef: RefObject<HTMLDivElement | null>;
  searchDraft: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export default function TransaksiSearch({
  isActive,
  onToggle,
}: TransaksiSearchProps) {
  return (
    <ToolbarIconButton
      icon={commonIcons.search}
      label="Cari rekod transaksi"
      isActive={isActive}
      onClick={onToggle}
    />
  );
}

export function TransaksiSearchPanel({
  inputRef,
  searchDraft,
  onChange,
  onClear,
}: TransaksiSearchPanelProps) {
  return (
    <div className="mt-3 px-3">
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div ref={inputRef} className="flex-1">
            <SharedInputField
              label="CARIAN REKOD TRANSAKSI"
              value={searchDraft}
              state="active"
              onChange={onChange}
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
            disabled={searchDraft.trim().length === 0}
            onClick={onClear}
          >
            Kosongkan
          </button>
        </div>
      </div>
    </div>
  );
}