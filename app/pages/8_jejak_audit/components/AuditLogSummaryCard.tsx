export default function AuditLogSummaryCard({
  totalRecords,
}: {
  totalRecords: number;
}) {
  return (
    <section className="mb-8 rounded-[7px] border border-[#EDF1F7] bg-white p-6 shadow-[0_4px_10px_rgba(15,23,42,0.03)]">
      <div className="text-xs font-bold uppercase tracking-[3px] text-[#555967]">
        Jumlah Aktiviti
      </div>
      <div className="mt-2 text-[40px] font-extrabold leading-none tracking-wide">
        {totalRecords.toLocaleString("ms-MY")}
      </div>
    </section>
  );
}
