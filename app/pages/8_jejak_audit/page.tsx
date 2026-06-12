import JejakAuditPageClient from "./components/JejakAuditPageClient";
import {
  getAuditLogFilterOptions,
  getAuditLogPage,
  parseAuditLogFilters,
} from "@/lib/audit/audit-logs";

type JejakAuditPageProps = {
  searchParams: Promise<{
    page?: string;
    auditId?: string;
    dateFrom?: string;
    dateTo?: string;
    actionType?: string;
    adminId?: string;
    search?: string;
  }>;
};

export default async function JejakAuditPage({
  searchParams,
}: JejakAuditPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialPage = Math.max(1, Number(resolvedSearchParams.page) || 1);
  const filters = parseAuditLogFilters(resolvedSearchParams);
  const [auditPage, filterOptions] = await Promise.all([
    getAuditLogPage(initialPage, filters),
    getAuditLogFilterOptions(),
  ]);

  return (
    <JejakAuditPageClient
      searchParams={resolvedSearchParams}
      initialData={{
        ...auditPage,
        filterOptions,
      }}
    />
  );
}
