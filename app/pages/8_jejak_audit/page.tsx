import JejakAuditPageClient from "./components/JejakAuditPageClient";
import { Suspense } from "react";

import AuditLogPageClient from "./components/AuditLogPageClient";
import AuditLogHeader from "./components/AuditLogHeader";
import AuditLogSummaryCard from "./components/AuditLogSummaryCard";
import AuditLogTablePanel from "./components/AuditLogTablePanel";

const EMPTY_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  firstRecord: 0,
  lastRecord: 0,
  perPage: 10,
};

export default async function JejakAuditPage({
  searchParams,
}: JejakAuditPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return <JejakAuditPageClient searchParams={resolvedSearchParams} />;
export default function JejakAuditPage() {
  return (
    <Suspense fallback={<AuditLogPageShell />}>
      <AuditLogPageClient />
    </Suspense>
  );
}

function AuditLogPageShell() {
  return (
    <main className="relative flex flex-col gap-4 text-[#0B1C30]">
      <AuditLogHeader />
      <AuditLogSummaryCard totalRecords={0} />
      <AuditLogTablePanel
        auditRows={[]}
        dataKey="audit-log-shell"
        filterOptions={{
          actionTypes: [],
          admins: [],
        }}
        filters={{}}
        hasActiveFilters={false}
        isInitialLoading
        pagination={EMPTY_PAGINATION}
      />
    </main>
  );
}
