import Icon from "@/app/components/Icon";

const auditRows = [
  {
    timestamp: "12 Jul 2024, 10:45 AM",
    actor: "Ahmad Zahir",
    module: "Muat Naik",
    actionType: "IMPORT_EXTRACT",
    target: "Dokumen Bayaran JULAI 2024",
    description: "Muat naik dan menjana draf data bayaran untuk semakan.",
  },
  {
    timestamp: "12 Jul 2024, 09:15 AM",
    actor: "Siti Aminah",
    module: "Pengurusan Penghuni",
    actionType: "UPDATE",
    target: "Ahmad Hakimi / 990101-01-1234",
    description: "Mengemaskini nombor telefon dan jabatan penghuni.",
  },
  {
    timestamp: "11 Jul 2024, 04:30 PM",
    actor: "Mohd Firdaus",
    module: "Pengurusan Kuarters",
    actionType: "DELETE",
    target: "Unit A-01-02",
    description: "Memadam unit kuarters yang tersalah didaftarkan.",
  },
  {
    timestamp: "11 Jul 2024, 02:00 PM",
    actor: "Ahmad Zahir",
    module: "Muat Naik",
    actionType: "VERIFY",
    target: "Dokumen Kuarters BLOK A",
    description: "Mengesahkan data kategori dan unit kuarters.",
  },
  {
    timestamp: "10 Jul 2024, 11:20 AM",
    actor: "Siti Aminah",
    module: "Tunggakan",
    actionType: "EXPORT",
    target: "Laporan Tunggakan Bulanan",
    description: "Mengeksport rekod tunggakan untuk kegunaan pentadbiran.",
  },
];

export default function JejakAuditPage() {
  return (
    <main className="flex h-full min-h-0 flex-col text-[#0B1C30]">
      <header className="mb-8">
        <h1 className="text-[31px] font-extrabold leading-tight">
          Jejak Audit
        </h1>
        <p className="mt-2 text-[15px] text-[#454955]">
          Rekod terperinci aktiviti sistem untuk ketelusan dan pemantauan
          pentadbiran.
        </p>
      </header>

      <section className="mb-8 rounded-[7px] border border-[#EDF1F7] bg-white p-6 shadow-[0_4px_10px_rgba(15,23,42,0.03)]">
        <div className="text-xs font-bold uppercase tracking-[3px] text-[#555967]">
          Jumlah Aktiviti
        </div>
        <div className="mt-2 text-[40px] font-extrabold leading-none tracking-wide">
          1,240
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-extrabold uppercase text-dark-blue">
          <span className="h-2 w-2 rounded-full bg-dark-blue" />
          Terkini
        </div>
      </section>

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
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-[5px] transition hover:bg-white hover:text-dark-blue"
              aria-label="Tapis rekod audit"
            >
              <Icon icon="filter" size={22} />
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-[5px] transition hover:bg-white hover:text-dark-blue"
              aria-label="Muat turun rekod audit"
            >
              <Icon icon="download" size={22} />
            </button>
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
                  <AuditHeader className="w-[18%]">Jenis Tindakan</AuditHeader>
                  <AuditHeader className="w-[20%]">Sasaran Data</AuditHeader>
                  <AuditHeader className="w-[10%] text-center">Butiran</AuditHeader>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => (
                  <tr key={`${row.timestamp}-${row.actor}-${row.description}`}>
                    <AuditCell>{row.timestamp}</AuditCell>
                    <AuditCell strong>{row.actor}</AuditCell>
                    <AuditCell>{row.module}</AuditCell>
                    <AuditCell>
                      <ActionBadge actionType={row.actionType} />
                    </AuditCell>
                    <AuditCell strong>{row.target}</AuditCell>
                    <AuditCell className="text-center">
                      <button
                        type="button"
                        className="inline-grid h-8 w-8 place-items-center rounded-[5px] text-[#607083] transition hover:bg-[#EEF3FF] hover:text-dark-blue"
                        aria-label={`Lihat butiran audit ${row.target}`}
                      >
                        <Icon icon="eye" size={18} />
                      </button>
                    </AuditCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="flex h-19.5 items-center justify-between gap-4 border-t border-[#F0F2F7] px-4 max-lg:min-w-245">
            <div className="flex items-center gap-1.5">
              <PageButton label="Sebelumnya">
                <Icon icon="chevronLeft" size={18} />
              </PageButton>
              <PageButton active>1</PageButton>
              <PageButton>2</PageButton>
              <PageButton>3</PageButton>
              <span className="w-7 text-center text-[#4B5563]">...</span>
              <PageButton>12</PageButton>
              <PageButton label="Seterusnya">
                <Icon icon="chevronRight" size={18} />
              </PageButton>
            </div>
            <div className="text-[13px] text-[#343844]">
              Menunjukkan 1-5 Daripada 120 Rekod
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function AuditHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
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

function ActionBadge({ actionType }: { actionType: string }) {
  return (
    <span className="inline-flex h-6 max-w-full items-center rounded-[5px] bg-[#EEF3FF] px-2.5 text-[10px] font-extrabold text-dark-blue">
      {formatActionType(actionType)}
    </span>
  );
}

function formatActionType(actionType: string) {
  return actionType.replace(/_/g, " ");
}

function AuditCell({
  children,
  strong = false,
  className = "",
}: {
  children: React.ReactNode;
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

function PageButton({
  children,
  active = false,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={[
        "grid h-8 w-8 place-items-center rounded-[5px] border text-sm font-bold transition",
        active
          ? "border-dark-blue bg-dark-blue text-white"
          : "border-[#EEF1F6] bg-white text-[#323746] hover:border-dark-blue hover:text-dark-blue",
      ].join(" ")}
      aria-label={label}
    >
      {children}
    </button>
  );
}
