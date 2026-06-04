"use client";

import { useEffect, useRef, useState } from "react";

import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import type { ResidentRecord } from "../page";

export function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchResidents(
  residents: ResidentRecord[],
  query: string,
): ResidentRecord[] {
  const normalizedQuery = normalizeSearchValue(query);

  if (normalizedQuery.length === 0) {
    return residents;
  }

  return residents.filter((resident) => {
    const searchableFields = [
      resident.fullName,
      resident.icNumber,
      resident.phone,
      resident.email,
      resident.position,
      resident.department,
      resident.quarters?.unitCode,
      resident.quarters?.quarterName,
      resident.quarters?.address,
    ].filter(Boolean) as string[];

    return searchableFields.some((field) =>
      normalizeSearchValue(field).includes(normalizedQuery)
    );
  });
}

type UsePenghuniSearchLogicProps = {
  value: string;
  onChange: (value: string) => void;
};

export function usePenghuniSearchLogic({
  value,
  onChange,
}: UsePenghuniSearchLogicProps) {
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(value.trim().length > 0);

  const isSearchFilterActive = value.trim().length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.querySelector("input")?.focus();
  }, [isOpen]);

  function handleToggleSearch() {
    if (isOpen) {
      onChange("");
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
  }

  function handleClearSearch() {
    onChange("");
    setIsOpen(false);
  }

  return {
    isOpen,
    isSearchFilterActive,
    searchInputRef,
    handleToggleSearch,
    handleClearSearch,
  };
}

type PenghuniSearchButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function PenghuniSearchButton({
  isOpen,
  onToggle,
}: PenghuniSearchButtonProps) {
  return (
    <ToolbarIconButton
      icon={commonIcons.search}
      label="Cari penghuni"
      isActive={isOpen}
      onClick={onToggle}
    />
  );
}
