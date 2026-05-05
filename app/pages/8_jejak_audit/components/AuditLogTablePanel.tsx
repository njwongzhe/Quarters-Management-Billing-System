import type { ReactNode } from "react";
import Link from "next/link";

import Icon from "@/app/components/Icon";
import type { AuditLogFilters, AuditLogListItem } from "@/lib/audit-logs";
import { buildAuditLogQueryString } from "@/lib/audit-logs";
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
  return (
    <section className="min-h-0 flex-1 rounded-[7px] bg-[#EDF3FF] p-7 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-extrabold">
            Senarai Aktiviti Sistem
          </h2>
          <p className="mt-1.5 text-[15px] text-[#454955]">
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

      <div className="overflow-hidden rounded-lg border border-[#EDF1F7] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 table-fixed border-collapse text-left">
            <thead className="bg-[#F3F6FB]">
              <tr>
                <AuditHeader className="w-[18%]">Tarikh & Masa</AuditHeader>
                <AuditHeader className="w-[16%]">Pengendali</AuditHeader>
                <AuditHeader className="w-[18%]">Modul</AuditHeader>
                <AuditHeader className="w-[18%] text-center">
                  Jenis Tindakan
                </AuditHeader>
                <AuditHeader className="w-[20%]">Sasaran Data</AuditHeader>
                <AuditHeader className="w-[10%] text-center">
                  Butiran
                </AuditHeader>
              </tr>
            </thead>
            <tbody>
              {auditRows.length > 0 ? (
                auditRows.map((row) => (
                  <tr key={row.id}>
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
                            page: pagination.currentPage,
                            auditId: row.id,
                          },
                        )}`}
                        className="inline-grid h-8 w-8 place-items-center rounded-[5px] text-[#607083] transition hover:bg-[#EEF3FF] hover:text-dark-blue"
                        aria-label={`Lihat butiran audit ${row.target}`}
                      >
                        <Icon icon="eye" size={18} />
                      </Link>
                    </AuditCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="h-32 border-t border-[#F0F2F7] px-4 text-center text-sm font-semibold text-[#667085]"
                  >
                    Tiada rekod audit operasi ditemui.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AuditLogPagination filters={filters} pagination={pagination} />
      </div>
    </section>
  );
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
        "h-11 px-4 text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#666A78]",
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
        "h-14 overflow-hidden text-ellipsis whitespace-nowrap border-t border-[#F0F2F7] px-4 text-[13px] text-[#111A2E]",
        strong ? "font-extrabold" : "",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}
