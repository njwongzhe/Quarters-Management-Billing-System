"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildAuditLogQueryString,
  type AuditLogFilters,
} from "../auditLogClient";

type UseAuditSearchControllerParams = {
  filters: AuditLogFilters;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
};

export function useAuditSearchController({
  filters,
  isOpen,
  onOpenChange,
}: UseAuditSearchControllerParams) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState(filters.search ?? "");

  useEffect(() => {
    if (!filters.search?.trim()) {
      onOpenChange(false);
    }

    setSearchQuery(filters.search ?? "");
  }, [filters.search, onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.querySelector("input")?.focus();
  }, [isOpen]);

  function updateSearch(nextQuery: string) {
    const nextFilters: AuditLogFilters = {
      ...filters,
      search: nextQuery.trim() || undefined,
    };

    router.replace(
      `/pages/8_jejak_audit${buildAuditLogQueryString(nextFilters, { page: 1 })}`,
    );
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const normalizedQuery = searchQuery.trim();
    const normalizedFilterQuery = (filters.search ?? "").trim();

    if (normalizedQuery === normalizedFilterQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      updateSearch(searchQuery);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters.search, isOpen, searchQuery]);

  function handleToggleSearch() {
    if (isOpen) {
      onOpenChange(false);
      setSearchQuery("");
      updateSearch("");
      return;
    }

    onOpenChange(true);
  }

  function handleClearSearch() {
    setSearchQuery("");
    onOpenChange(false);
    updateSearch("");
  }

  return {
    searchInputRef,
    searchQuery,
    setSearchQuery,
    handleToggleSearch,
    handleClearSearch,
  };
}