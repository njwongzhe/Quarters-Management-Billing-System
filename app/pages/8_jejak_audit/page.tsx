import AuditLogDetailOverlay from "./components/AuditLogDetailOverlay";
import AuditLogHeader from "./components/AuditLogHeader";
import AuditLogSummaryCard from "./components/AuditLogSummaryCard";
import AuditLogTablePanel from "./components/AuditLogTablePanel";
import {
  buildAuditLogQueryString,
  getAuditLogDetail,
  getAuditLogFilterOptions,
  getAuditLogPage,
  hasActiveAuditLogFilters,
  parseAuditLogFilters,
} from "@/lib/audit/audit-logs";

type JejakAuditPageProps = {
  searchParams?: Promise<{
    page?: string;
    auditId?: string;
    dateFrom?: string;
    dateTo?: string;
    actionType?: string;
    adminId?: string;
  }>;
};

export default async function JejakAuditPage({
  searchParams,
}: JejakAuditPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const selectedAuditId = resolvedSearchParams?.auditId;
  const filters = parseAuditLogFilters({
    dateFrom: resolvedSearchParams?.dateFrom,
    dateTo: resolvedSearchParams?.dateTo,
    actionType: resolvedSearchParams?.actionType,
    adminId: resolvedSearchParams?.adminId,
  });
  const hasActiveFilters = hasActiveAuditLogFilters(filters);

  const [auditPage, filterOptions, selectedAuditLog] = await Promise.all([
    getAuditLogPage(currentPage, filters),
    getAuditLogFilterOptions(),
    selectedAuditId ? getAuditLogDetail(selectedAuditId) : Promise.resolve(null),
  ]);

  const { records: auditRows, pagination } = auditPage;

  return (
    <main className="relative flex flex-col gap-4 text-[#0B1C30]">
      <AuditLogHeader />
      <AuditLogSummaryCard totalRecords={pagination.totalRecords} />
      <AuditLogTablePanel
        auditRows={auditRows}
        filterOptions={filterOptions}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        pagination={pagination}
      />

      {selectedAuditId ? (
        <AuditLogDetailOverlay
          auditLog={selectedAuditLog}
          closeHref={`/pages/8_jejak_audit${buildAuditLogQueryString(filters, {
            page: pagination.currentPage,
          })}`}
        />
      ) : null}
    </main>
  );
}
