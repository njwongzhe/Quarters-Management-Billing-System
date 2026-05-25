"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type {
  AuditActionTypeFilter,
  AuditLogDetailItem,
  AuditLogFilters,
  AuditLogListItem,
} from "@/lib/audit/audit-logs";
import AuditLogDetailOverlay from "./AuditLogDetailOverlay";
import AuditLogHeader from "./AuditLogHeader";
import AuditLogSummaryCard from "./AuditLogSummaryCard";
import AuditLogTablePanel from "./AuditLogTablePanel";

type AuditPagination = {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  firstRecord: number;
  lastRecord: number;
  perPage: number;
};

type AuditLogFilterOptions = {
  actionTypes: {
    value: string;
    label: string;
  }[];
  admins: {
    id: string;
    name: string;
  }[];
};

type AuditLogPageResponse = {
  success: boolean;
  message?: string;
  data?: {
    records: AuditLogListItem[];
    pagination: AuditPagination;
    filterOptions: AuditLogFilterOptions;
  };
};

type AuditLogDetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    auditLog: AuditLogDetailItem;
  };
};

type AuditLogPageState = {
  queryString: string;
  auditRows: AuditLogListItem[];
  pagination: AuditPagination;
  filterOptions: AuditLogFilterOptions;
  errorMessage: string;
};

type AuditLogDetailState = {
  auditId: string;
  auditLog: AuditLogDetailItem | null;
  errorMessage: string;
};

const EMPTY_FILTER_OPTIONS: AuditLogFilterOptions = {
  actionTypes: [],
  admins: [],
};

const UNRESOLVED_QUERY_STRING = "__unresolved_audit_query__";

const DEFAULT_PAGINATION: AuditPagination = {
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  firstRecord: 0,
  lastRecord: 0,
  perPage: 10,
};

export default function AuditLogPageClient() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const currentSearchParams = useMemo(
    () => new URLSearchParams(queryString),
    [queryString],
  );
  const filters = useMemo(
    () =>
      parseFilters({
        dateFrom: currentSearchParams.get("dateFrom") ?? undefined,
        dateTo: currentSearchParams.get("dateTo") ?? undefined,
        actionType: currentSearchParams.get("actionType") ?? undefined,
        adminId: currentSearchParams.get("adminId") ?? undefined,
      }),
    [currentSearchParams],
  );
  const selectedAuditId = currentSearchParams.get("auditId");
  const currentPage = Math.max(1, Number(currentSearchParams.get("page")) || 1);
  const listQueryString = useMemo(() => {
    const params = new URLSearchParams(queryString);
    params.delete("auditId");

    return params.toString();
  }, [queryString]);
  const [auditPageState, setAuditPageState] = useState<AuditLogPageState>({
    queryString: UNRESOLVED_QUERY_STRING,
    auditRows: [],
    pagination: DEFAULT_PAGINATION,
    filterOptions: EMPTY_FILTER_OPTIONS,
    errorMessage: "",
  });
  const [auditDetailState, setAuditDetailState] =
    useState<AuditLogDetailState | null>(null);
  const isLoading = auditPageState.queryString !== listQueryString;
  const auditRows = isLoading ? [] : auditPageState.auditRows;
  const pagination = isLoading
    ? { ...DEFAULT_PAGINATION, currentPage }
    : auditPageState.pagination;
  const filterOptions = auditPageState.filterOptions;
  const errorMessage = isLoading ? "" : auditPageState.errorMessage;
  const isDetailLoading = Boolean(
    selectedAuditId && auditDetailState?.auditId !== selectedAuditId,
  );
  const selectedAuditLog =
    selectedAuditId && auditDetailState?.auditId === selectedAuditId
      ? auditDetailState.auditLog
      : null;
  const detailErrorMessage =
    selectedAuditId && auditDetailState?.auditId === selectedAuditId
      ? auditDetailState.errorMessage
      : "";
  const hasActiveFilters = hasActiveAuditLogFilters(filters);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/audit-logs?${listQueryString}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | AuditLogPageResponse
          | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(
            payload?.message ?? "Gagal mendapatkan rekod jejak audit.",
          );
        }

        setAuditPageState({
          queryString: listQueryString,
          auditRows: payload.data.records,
          pagination: payload.data.pagination,
          filterOptions: payload.data.filterOptions,
          errorMessage: "",
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAuditPageState((currentState) => ({
          queryString: listQueryString,
          auditRows: [],
          pagination: {
            ...DEFAULT_PAGINATION,
            currentPage,
          },
          filterOptions: currentState.filterOptions,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Gagal mendapatkan rekod jejak audit.",
        }));
      });

    return () => controller.abort();
  }, [currentPage, listQueryString]);

  useEffect(() => {
    if (!selectedAuditId) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/audit-logs/${selectedAuditId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | AuditLogDetailResponse
          | null;

        if (!response.ok || !payload?.success || !payload.data?.auditLog) {
          throw new Error(
            payload?.message ?? "Gagal mendapatkan butiran jejak audit.",
          );
        }

        setAuditDetailState({
          auditId: selectedAuditId,
          auditLog: payload.data.auditLog,
          errorMessage: "",
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAuditDetailState({
          auditId: selectedAuditId,
          auditLog: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Gagal mendapatkan butiran jejak audit.",
        });
      });

    return () => controller.abort();
  }, [selectedAuditId]);

  return (
    <main className="relative flex flex-col gap-4 text-[#0B1C30]">
      <AuditLogHeader />
      <AuditLogSummaryCard totalRecords={pagination.totalRecords} />
      <AuditLogTablePanel
        auditRows={auditRows}
        dataKey={listQueryString}
        filterOptions={filterOptions}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        initialErrorMessage={errorMessage}
        isInitialLoading={isLoading}
        pagination={pagination}
      />

      {selectedAuditId ? (
        <AuditLogDetailOverlay
          auditLog={selectedAuditLog}
          closeHref={`/pages/8_jejak_audit${buildAuditLogQueryString(filters, {
            page: currentPage,
          })}`}
          errorMessage={detailErrorMessage}
          isLoading={isDetailLoading}
        />
      ) : null}
    </main>
  );
}

function parseFilters(input: {
  dateFrom?: string;
  dateTo?: string;
  actionType?: string;
  adminId?: string;
}): AuditLogFilters {
  const filters: AuditLogFilters = {};

  if (isValidDateInput(input.dateFrom)) {
    filters.dateFrom = input.dateFrom;
  }

  if (isValidDateInput(input.dateTo)) {
    filters.dateTo = input.dateTo;
  }

  if (input.actionType) {
    filters.actionType = input.actionType as AuditActionTypeFilter;
  }

  if (input.adminId?.trim()) {
    filters.adminId = input.adminId.trim();
  }

  return filters;
}

function hasActiveAuditLogFilters(filters: AuditLogFilters) {
  return Boolean(
    filters.dateFrom || filters.dateTo || filters.actionType || filters.adminId,
  );
}

function buildAuditLogQueryString(
  filters: AuditLogFilters,
  extraParams: Record<string, string | number | null | undefined> = {},
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(extraParams)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, String(value));
  }

  const nextQueryString = params.toString();

  return nextQueryString ? `?${nextQueryString}` : "";
}

function isValidDateInput(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
