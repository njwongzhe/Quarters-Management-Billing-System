import type { ReactNode } from "react";
import Link from "next/link";

import Icon from "@/app/components/Icon/Icon";
import type { AuditLogFilters } from "@/lib/audit-logs";
import { buildAuditLogQueryString } from "@/lib/audit-logs";

type AuditPagination = {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  firstRecord: number;
  lastRecord: number;
};

export default function AuditLogPagination({
  pagination,
  filters,
}: {
  pagination: AuditPagination;
  filters: AuditLogFilters;
}) {
  const isFirstPage = pagination.currentPage <= 1;
  const isLastPage = pagination.currentPage >= pagination.totalPages;

  return (
    <footer className="flex flex-col gap-3 border-t border-light-grey/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 max-lg:min-w-245">
      <div className="flex flex-wrap items-center gap-2">
        <PageButton
          href={buildPageHref(Math.max(1, pagination.currentPage - 1), filters)}
          label="Halaman sebelumnya"
          disabled={isFirstPage}
        >
          <Icon icon="chevronLeft" size={18} />
        </PageButton>
        {buildPaginationItems(
          pagination.currentPage,
          pagination.totalPages,
        ).map((item, index) =>
          item === "dots" ? (
            <span
              key={`dots-${index}`}
              className="px-1 text-sm font-semibold text-grey"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <PageButton
              key={item}
              href={buildPageHref(item, filters)}
              active={item === pagination.currentPage}
            >
              {item}
            </PageButton>
          ),
        )}
        <PageButton
          href={buildPageHref(
            Math.min(pagination.totalPages, pagination.currentPage + 1),
            filters,
          )}
          label="Halaman seterusnya"
          disabled={isLastPage}
        >
          <Icon icon="chevronRight" size={18} />
        </PageButton>
      </div>
      <p className="text-sm text-grey">
        Menunjukkan {pagination.firstRecord}-{pagination.lastRecord} daripada{" "}
        {pagination.totalRecords} rekod
      </p>
    </footer>
  );
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "dots", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, "dots", totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [1, "dots", currentPage, "dots", totalPages] as const;
}

function buildPageHref(page: number, filters: AuditLogFilters) {
  return `/pages/8_jejak_audit${buildAuditLogQueryString(filters, { page })}`;
}

function PageButton({
  children,
  active = false,
  label,
  href,
  disabled = false,
}: {
  children: ReactNode;
  active?: boolean;
  label?: string;
  href: string;
  disabled?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors",
        active
          ? "border-dark-blue bg-dark-blue text-white"
          : "border-light-grey/30 bg-white text-grey hover:border-dark-blue hover:text-dark-blue",
        disabled ? "pointer-events-none opacity-40" : "",
      ].join(" ")}
      aria-label={label}
      aria-disabled={disabled}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
