"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";

import type { QuarterUnitOccupancyDetails } from "@/lib/quarters/quarter-units";

type UseHistorySearchResult = {
  filteredRecords: QuarterUnitOccupancyDetails[];
  searchKey: string;
  searchInputRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  isSearchOpen: boolean;
  isSearchActive: boolean;
  setSearchQuery: (value: string) => void;
  handleClearSearch: () => void;
  SearchButton: React.ReactNode;
};

function normalizeForSearch(value: string) {
  return value.trim().toLowerCase();
}

export function useHistorySearch(
  records: QuarterUnitOccupancyDetails[],
): UseHistorySearchResult {
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = normalizeForSearch(searchQuery);
  const isSearchActive = normalizedQuery.length > 0;

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    searchInputRef.current?.querySelector("input")?.focus();
  }, [isSearchOpen]);

  const filteredRecords = useMemo(() => {
    if (!isSearchActive) {
      return records;
    }

    return records.filter((record) => {
      const searchableValue = [
        record.occupantName,
        record.occupantIcNumber,
      ]
        .join(" ")
        .toLowerCase();

      return searchableValue.includes(normalizedQuery);
    });
  }, [isSearchActive, normalizedQuery, records]);

  function handleToggleSearch() {
    if (isSearchOpen) {
      setIsSearchOpen(false);
      setSearchQuery("");
      return;
    }

    setIsSearchOpen(true);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setIsSearchOpen(false);
  }

  const SearchButton = (
    <ToolbarButton
      icon={commonIcons.search}
      label="Cari sejarah penghunian"
      isActive={isSearchOpen || isSearchActive}
      onClick={handleToggleSearch}
    />
  );

  return {
    filteredRecords,
    searchKey: normalizedQuery,
    searchInputRef,
    searchQuery,
    isSearchOpen,
    isSearchActive,
    setSearchQuery,
    handleClearSearch,
    SearchButton,
  };
}
