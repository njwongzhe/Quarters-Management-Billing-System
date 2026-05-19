"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import Icon from "@/app/components/Icon/Icon";
import type { AuditLogFilters, AuditLogListItem } from "@/lib/audit/audit-logs";
import AuditActionBadge from "./AuditActionBadge";
import AuditLogDownloadButton from "./AuditLogDownloadButton";
import AuditLogFilterPanel from "./AuditLogFilterPanel";
import AuditLogPagination from "./AuditLogPagination";

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
  filterOptions,
  filters,
  hasActiveFilters,
  pagination,
}: {
  auditRows: AuditLogListItem[];
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
  pagination: AuditPagination;
}) {
  const [rows, setRows] = useState(auditRows);
  const [currentPagination, setCurrentPagination] = useState(pagination);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    setRows(auditRows);
    setCurrentPagination(pagination);
    setPageError("");
  }, [auditRows, pagination]);

  async function handlePageChange(page: number) {
    const safePage = Math.min(Math.max(1, page), currentPagination.totalPages);

    if (safePage === currentPagination.currentPage || isLoadingPage) {
      return;
    }

    const queryString = buildAuditLogQueryString(filters, { page: safePage });

    setIsLoadingPage(true);
    setPageError("");

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

      setRows(payload.data.records);
      setCurrentPagination(payload.data.pagination);
      window.history.replaceState(
        null,
        "",
        `/pages/8_jejak_audit${queryString}`,
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Gagal mendapatkan rekod jejak audit.",
      );
    } finally {
      setIsLoadingPage(false);
    }
  }

  return (
    <section className="min-h-0 flex-1 rounded-[7px] bg-[#EDF3FF] p-7 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-bold text-dark-grey">
            Senarai Aktiviti Sistem
          </h2>
          <p className="mt-1.5 text-[15px] text-grey">
            Rekod terperinci bagi setiap aktiviti sistem.
          </p>
        </div>

        <div className="flex items-center gap-4 text-[#607083]">
          <AuditLogFilterPanel
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            options={filterOptions}
          />
          <AuditLogDownloadButton
            exportHref={`/api/audit-logs/export${buildAuditLogQueryString(
              filters,
            )}`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white">
        {pageError ? (
          <div className="border-b border-light-grey/20 bg-[#FFF4F4] px-4 py-3 text-sm font-semibold text-[#B42318]">
            {pageError}
          </div>
        ) : null}

        <div className="overflow-x-auto overflow-y-auto" aria-busy={isLoadingPage}>
          <table className="w-full min-w-245 text-left">
            <thead className="bg-background">
              <tr className="bg-background text-xs font-bold text-grey">
                <AuditHeader>Tarikh & Masa</AuditHeader>
                <AuditHeader>Pengendali</AuditHeader>
                <AuditHeader>Modul</AuditHeader>
                <AuditHeader className="text-center!">
                  Jenis Tindakan
                </AuditHeader>
                <AuditHeader>Sasaran Data</AuditHeader>
                <AuditHeader className="text-center!">
                  Butiran
                </AuditHeader>
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-light-grey/20 transition-colors hover:bg-background/60"
                  >
                    <AuditCell>{row.timestampLabel}</AuditCell>
                    <AuditCell strong>{row.actor}</AuditCell>
                    <AuditCell>{row.module}</AuditCell>
                    <AuditCell className="text-center">
                      <AuditActionBadge actionType={row.actionType} />
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
                <tr className="border-t border-light-grey/20">
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-sm font-semibold text-grey"
                  >
                    Tiada rekod audit operasi ditemui.
                  </td>
                </tr>
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
