export default function AuditLogSummaryCard({
  totalRecords,
  isLoading = false,
}: {
  totalRecords: number;
  isLoading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-1 rounded-lg border-l-4 border-l-dark-blue bg-white p-4 shadow">
      <div className="text-xs font-semibold text-grey/70">
        Jumlah Aktiviti
      </div>
      <div className="text-3xl font-bold text-dark-grey">
        {isLoading ? "0" : totalRecords.toLocaleString("ms-MY")}
      </div>
    </section>
  );
}
