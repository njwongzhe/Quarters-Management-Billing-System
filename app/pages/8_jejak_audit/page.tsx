import AuditLogDetailOverlay from "./components/AuditLogDetailOverlay";
import AuditLogHeader from "./components/AuditLogHeader";
import AuditLogSummaryCard from "./components/AuditLogSummaryCard";
import AuditLogTablePanel from "./components/AuditLogTablePanel";
import { getAuditLogDetail, getAuditLogPage } from "@/lib/audit-logs";

type JejakAuditPageProps = {
  searchParams?: Promise<{
    page?: string;
    auditId?: string;
  }>;
};

export default async function JejakAuditPage({
  searchParams,
}: JejakAuditPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const selectedAuditId = resolvedSearchParams?.auditId;

  const [auditPage, selectedAuditLog] = await Promise.all([
    getAuditLogPage(currentPage),
    selectedAuditId ? getAuditLogDetail(selectedAuditId) : Promise.resolve(null),
  ]);

  const { records: auditRows, pagination } = auditPage;

  return (
    <main className="relative flex h-full min-h-0 flex-col text-[#0B1C30]">
      <AuditLogHeader />
      <AuditLogSummaryCard totalRecords={pagination.totalRecords} />
      <AuditLogTablePanel auditRows={auditRows} pagination={pagination} />

      {selectedAuditId ? (
        <AuditLogDetailOverlay
          auditLog={selectedAuditLog}
          closeHref={`/pages/8_jejak_audit?page=${pagination.currentPage}`}
        />
      ) : null}
    </main>
  );
}
