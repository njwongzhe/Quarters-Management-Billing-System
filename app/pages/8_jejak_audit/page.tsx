import JejakAuditPageClient from "./components/JejakAuditPageClient";

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

  return <JejakAuditPageClient searchParams={resolvedSearchParams} />;
}
