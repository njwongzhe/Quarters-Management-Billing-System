"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import Icon from "@/app/components/Icon/Icon";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import AuditDownload from "./Button/AuditDownload";
import AuditFilter from "./Button/AuditFilter";
import AuditLogPagination from "./AuditLogPagination";
import { useAuditSearchController } from "./Button/AuditSearch";
import SearchBar, { SearchBarToggleButton } from "@/app/components/SearchBar";
import type { AuditLogFilters, AuditLogListItem } from "./auditLogClient";
import AuditFilterDate from "./Button/AuditFilterDate";
import { getAuditActionBadgeColor } from "./auditLogActionColor";

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
  };
};

export default function AuditLogTablePanel({
  auditRows,
  dataKey,
  filterOptions,
  filters,
  hasActiveFilters,
  initialErrorMessage = "",
  isInitialLoading = false,
  pagination,
  isBootstrapping = false,
  bootstrapError = "",
  onRowDoubleClick,
}: {
  auditRows: AuditLogListItem[];
  dataKey: string;
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
  filters: AuditLogFilters;
  hasActiveFilters: boolean;
  initialErrorMessage?: string;
  isInitialLoading?: boolean;
  pagination: AuditPagination;
  isBootstrapping?: boolean;
  bootstrapError?: string;
  onRowDoubleClick?: (auditId: string) => void;
}) {
  void hasActiveFilters;

  const [pageData, setPageData] = useState<{
    dataKey: string;
    rows: AuditLogListItem[];
    pagination: AuditPagination;
  } | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageError, setPageError] = useState<{
    dataKey: string;
    message: string;
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(filters.search?.trim()));

  const {
    searchInputRef,
    searchQuery,
    setSearchQuery,
    handleToggleSearch,
    handleClearSearch,
  } = useAuditSearchController({
    filters,
    isOpen: isSearchOpen,
    onOpenChange: setIsSearchOpen,
  });

  const activePageData = pageData?.dataKey === dataKey ? pageData : null;
  const rows = activePageData?.rows ?? auditRows;
  const currentPagination = activePageData?.pagination ?? pagination;
  const currentPageError = pageError?.dataKey === dataKey ? pageError.message : "";
  const isToolbarDisabled = isBootstrapping || isInitialLoading || isLoadingPage;

  async function handlePageChange(page: number) {
    const safePage = Math.min(Math.max(1, page), currentPagination.totalPages);

    if (safePage === currentPagination.currentPage || isLoadingPage) {
      return;
    }

    const queryString = buildAuditLogQueryString(filters, { page: safePage });

    setIsLoadingPage(true);
    setPageError(null);

    try {
      const response = await fetch(`/api/audit-logs${queryString}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | AuditLogPageResponse
        | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(
          payload?.message ?? "Gagal mendapatkan rekod jejak audit.",
        );
      }

      setPageData({
        dataKey,
        rows: payload.data.records,
        pagination: payload.data.pagination,
      });
      window.history.replaceState(
        null,
        "",
        `/pages/8_jejak_audit${queryString}`,
      );
    } catch (error) {
      setPageError({
        dataKey,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan rekod jejak audit.",
      });
    } finally {
      setIsLoadingPage(false);
    }
  }

  return (
    <section className="min-h-0 flex-1 rounded-lg bg-light-blue p-1 flex flex-col gap-3">
      <div className="flex flex-col gap-3 pt-3 px-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-dark-grey">
              Senarai Aktiviti Sistem
            </h2>
            <p className="text-xs text-grey/70">
              Rekod terperinci bagi setiap aktiviti sistem.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[#607083]">
            <SearchBarToggleButton
              label="Cari rekod audit"
              isOpen={isSearchOpen}
              onToggle={handleToggleSearch}
            />
            <AuditFilterDate filters={filters} onBeforeOpen={() => {}} />
            <AuditFilter filters={filters} options={filterOptions} />
            <AuditDownload
              disabled={isToolbarDisabled}
              exportHref={`/api/audit-logs/export${buildAuditLogQueryString(
                filters,
              )}`}
            />
          </div>
        </div>

        {isSearchOpen ? (
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={handleClearSearch}
            label="CARIAN KATA KUNCI MERENTASI SEMUA MEDAN REKOD AUDIT"
            placeholder="Contoh: Ahmad, Tunggakan atau UPDATE"
            inputRef={searchInputRef}
          />
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {bootstrapError ? (
          <div className="border-b border-light-grey/20 bg-[#FFF4F4] px-4 py-3 text-sm font-semibold text-[#B42318]">
            {bootstrapError}
          </div>
        ) : currentPageError || initialErrorMessage ? (
          <div className="border-b border-light-grey/20 bg-[#FFF4F4] px-4 py-3 text-sm font-semibold text-[#B42318]">
            {currentPageError || initialErrorMessage}
          </div>
        ) : null}

        <div
          className="overflow-x-auto overflow-y-auto"
          aria-busy={isLoadingPage || isInitialLoading}
        >
          <table className="w-full min-w-245 text-left">
            <thead className="bg-background">
              <tr className="bg-background text-xs font-bold text-grey">
                <AuditHeader>Tarikh & Masa</AuditHeader>
                <AuditHeader>Pengendali</AuditHeader>
                <AuditHeader>Modul</AuditHeader>
                <AuditHeader className="text-center!">Jenis Tindakan</AuditHeader>
                <AuditHeader>Sasaran Data</AuditHeader>
                <th className="w-[0%] text-center p-3 whitespace-nowrap">Tindakan</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isBootstrapping ? (
                loadingTableRows({
                  mode: "loading",
                  columnCount: 6,
                  rowCount: 10,
                })
              ) : isLoadingPage ? (
                loadingTableRows({
                  mode: "loading",
                  columnCount: 6,
                  rowCount: 10,
                })
              ) : isInitialLoading ? (
                loadingTableRows({
                  mode: "loading",
                  columnCount: 6,
                  rowCount: 10,
                })
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-light-grey/20 transition-colors hover:bg-background/60 cursor-auto select-text"
                    onDoubleClick={() => onRowDoubleClick?.(row.id)}
                  >
                    <AuditCell>{row.timestampLabel}</AuditCell>
                    <AuditCell strong>{row.actor}</AuditCell>
                    <AuditCell>{row.module}</AuditCell>
                    <AuditCell className="text-center">
                      <span
                        className={`inline-flex h-6 max-w-full items-center rounded-[5px] px-2.5 text-[10px] font-bold ${getAuditActionBadgeColor(row.actionType)}`}
                      >
                        {row.actionTypeLabel}
                      </span>
                    </AuditCell>
                    <AuditCell strong>{row.target}</AuditCell>
                    <AuditCell className="text-center">
                      <Link
                        href={`/pages/8_jejak_audit${buildAuditLogQueryString(
                          filters,
                          {
                            page: currentPagination.currentPage,
                            auditId: row.id,
                          },
                        )}`}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg text-grey transition-colors hover:bg-background hover:text-dark-blue"
                        aria-label={`Lihat butiran audit ${row.target}`}
                      >
                        <Icon icon="eye" size={18} />
                      </Link>
                    </AuditCell>
                  </tr>
                ))
              ) : (
                loadingTableRows({
                  mode: "message",
                  columnCount: 6,
                  rowCount: 1,
                  message: "Tiada rekod audit operasi ditemui.",
                })
              )}
            </tbody>
          </table>
        </div>

        <AuditLogPagination
          pagination={currentPagination}
          onPageChange={handlePageChange}
        />
      </div>
    </section>
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

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

function AuditHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "w-min whitespace-nowrap p-3 text-left",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function AuditCell({
  children,
  strong = false,
  className = "",
}: {
  children: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        "w-min overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-sm text-dark-grey",
        strong ? "font-semibold" : "font-medium",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}
