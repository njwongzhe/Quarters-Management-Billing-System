"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import AuditLogDetailOverlay from "./AuditLogDetailOverlay";
import AuditLogHeader from "./AuditLogHeader";
import AuditLogSummaryCard from "./AuditLogSummaryCard";
import AuditLogTablePanel from "./AuditLogTablePanel";
import {
  buildAuditLogQueryString,
  hasActiveAuditLogFilters,
  parseAuditLogFilters,
  type AuditLogDetailItem,
  type AuditLogListItem,
} from "./auditLogClient";

type AuditPagination = {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  firstRecord: number;
  lastRecord: number;
  perPage: number;
};

type AuditLogPageResponse = {
  success: boolean;
  message?: string;
  data?: {
    records: AuditLogListItem[];
    pagination: AuditPagination;
    filterOptions: {
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
};

type AuditLogDetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    auditLog: AuditLogDetailItem;
  };
};

type JejakAuditPageClientProps = {
  searchParams: {
    page?: string;
    auditId?: string;
    dateFrom?: string;
    dateTo?: string;
    actionType?: string;
    adminId?: string;
    search?: string;
  };
  initialData?: NonNullable<AuditLogPageResponse["data"]>;
};

export default function JejakAuditPageClient({
  searchParams,
  initialData,
}: JejakAuditPageClientProps) {
  const hasInitialData = initialData !== undefined;
  const initialPage = Math.max(1, Number(searchParams.page) || 1);
  const initialAuditId = searchParams.auditId;
  const filters = useMemo(
    () =>
      parseAuditLogFilters({
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
        actionType: searchParams.actionType,
        adminId: searchParams.adminId,
        search: searchParams.search,
      }),
    [
      searchParams.adminId,
      searchParams.actionType,
      searchParams.dateFrom,
      searchParams.dateTo,
      searchParams.search,
    ],
  );
  const hasActiveFilters = hasActiveAuditLogFilters(filters);

  const [auditRows, setAuditRows] = useState<AuditLogListItem[]>(
    initialData?.records ?? [],
  );
  const [pagination, setPagination] = useState<AuditPagination>(
    initialData?.pagination ?? {
      currentPage: initialPage,
      totalPages: 1,
      totalRecords: 0,
      firstRecord: 0,
      lastRecord: 0,
      perPage: 10,
    },
  );
  const [filterOptions, setFilterOptions] = useState(
    initialData?.filterOptions ?? {
      actionTypes: [] as { value: string; label: string }[],
      admins: [] as { id: string; name: string }[],
    },
  );
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogDetailItem | null>(null);
  const [overlayAuditId, setOverlayAuditId] = useState<string | undefined>(initialAuditId);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [isBootstrapping, setIsBootstrapping] = useState(!hasInitialData);
  const [bootstrapError, setBootstrapError] = useState("");
  const shouldSkipInitialFetchRef = useRef(hasInitialData);

  useEffect(() => {
    setOverlayAuditId(initialAuditId);
  }, [initialAuditId]);

  useEffect(() => {
    if (shouldSkipInitialFetchRef.current) {
      shouldSkipInitialFetchRef.current = false;
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function loadPageData() {
      setIsBootstrapping(true);
      setBootstrapError("");

      try {
        const queryString = buildAuditLogQueryString(filters, {
          page: initialPage,
        });

        const pageResponse = await fetch(`/api/audit-logs${queryString}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const pagePayload = (await pageResponse.json().catch(() => null)) as
          | AuditLogPageResponse
          | null;

        if (!pageResponse.ok || !pagePayload?.success || !pagePayload.data) {
          throw new Error(
            pagePayload?.message ?? "Gagal mendapatkan rekod jejak audit.",
          );
        }

        if (!isMounted) {
          return;
        }

        setAuditRows(pagePayload.data.records);
        setPagination(pagePayload.data.pagination);
        setFilterOptions(pagePayload.data.filterOptions);
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setBootstrapError(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan rekod jejak audit.",
        );
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setIsBootstrapping(false);
        }
      }
    }

    void loadPageData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [filters, initialPage]);

  useEffect(() => {
    if (!overlayAuditId) {
      setSelectedAuditLog(null);
      setIsDetailLoading(false);
      setDetailError(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function loadDetailData() {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const detailResponse = await fetch(`/api/audit-logs/${overlayAuditId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const detailPayload = (await detailResponse.json().catch(() => null)) as
          | AuditLogDetailResponse
          | null;

        if (!detailResponse.ok || !detailPayload?.success || !detailPayload.data) {
          throw new Error(
            detailPayload?.message ?? "Gagal mendapatkan butiran jejak audit.",
          );
        }

        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setSelectedAuditLog(detailPayload.data.auditLog);
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setSelectedAuditLog(null);
        setDetailError(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan butiran jejak audit.",
        );
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadDetailData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [overlayAuditId, detailReloadToken]);

  function handleCloseOverlay() {
    const closeUrl = `/pages/8_jejak_audit${buildAuditLogQueryString(filters, {
      page: pagination.currentPage,
    })}`;

    window.history.replaceState(null, "", closeUrl);
    setOverlayAuditId(undefined);
    setSelectedAuditLog(null);
    setIsDetailLoading(false);
    setDetailError(null);
  }

  function handleRowDoubleClick(auditId: string) {
    const detailUrl = `/pages/8_jejak_audit${buildAuditLogQueryString(filters, {
      page: pagination.currentPage,
      auditId,
    })}`;
    window.history.replaceState(null, "", detailUrl);
    setOverlayAuditId(auditId);
  }

  return (
    <main className="relative flex flex-col gap-4 text-content">
      <AuditLogHeader />
      <AuditLogSummaryCard
        totalRecords={pagination.totalRecords}
        isLoading={isBootstrapping}
      />
      <AuditLogTablePanel
        auditRows={auditRows}
        dataKey={buildAuditLogQueryString(filters, { page: pagination.currentPage })}
        filterOptions={filterOptions}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        pagination={pagination}
        isBootstrapping={isBootstrapping}
        bootstrapError={bootstrapError}
        onRowDoubleClick={handleRowDoubleClick}
      />

      {overlayAuditId ? (
        <AuditLogDetailOverlay
          auditLog={selectedAuditLog}
          isLoading={isDetailLoading}
          errorMessage={detailError}
          onRetry={() => setDetailReloadToken((currentValue) => currentValue + 1)}
          onClose={handleCloseOverlay}
        />
      ) : null}
    </main>
  );
}
