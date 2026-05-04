import Icon from "@/app/components/Icon";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statTemplates = [
  {
    label: "Jumlah Rekod",
    helper: "Terkini",
    icon: "fact_check",
    accent: "border-l-dark-blue",
    dot: "bg-dark-blue",
    helperColor: "text-dark-blue",
  },
  {
    label: "Cukup Bayaran",
    helper: "Bayaran Lengkap",
    icon: "check_circle",
    accent: "border-l-cukup",
    dot: "bg-cukup",
    helperColor: "text-cukup",
  },
  {
    label: "Kurang Bayaran",
    helper: "Perlu Semakan",
    icon: "error",
    accent: "border-l-kurang",
    dot: "bg-kurang",
    helperColor: "text-kurang",
  },
  {
    label: "Lebihan Bayaran",
    helper: "Kredit Tersimpan",
    icon: "add_circle",
    accent: "border-l-lebih",
    dot: "bg-lebih",
    helperColor: "text-lebih",
  },
  {
    label: "Data Tidak Lengkap",
    helper: "Tindakan Segera",
    icon: "warning",
    accent: "border-l-x-lengkap",
    dot: "bg-x-lengkap",
    helperColor: "text-x-lengkap",
  },
];

const checks = [
  ["Cukup Bayaran", "bg-cukup"],
  ["Kurang Bayaran", "bg-kurang"],
  ["Lebihan Bayaran", "bg-lebih"],
  ["Data Tidak Lengkap", "bg-x-lengkap"],
] as const;

type PaymentStatus = "green" | "red" | "blue" | "purple";

type BayaranRow = {
  id: string;
  name: string;
  ic: string;
  quarters: string;
  unit: string;
  arrears: string;
  amount: string;
  tone: PaymentStatus;
};

type PaymentQueryRow = {
  id: string;
  residentId: string | null;
  fullName: string | null;
  icNumber: string | null;
  categoryName: string | null;
  unitCode: string | null;
  extractedName: string | null;
  extractedIcNumber: string | null;
  extractedKuarters: string | null;
  extractedUnit: string | null;
  rentalPrice: unknown;
  maintenancePrice: unknown;
  totalArrearsAmount: unknown;
  amount: unknown;
};

type PaymentStatsQueryRow = {
  total: bigint;
  cukup: bigint;
  kurang: bigint;
  lebih: bigint;
  tidakLengkap: bigint;
};

const ROWS_PER_PAGE = 10;

type BayaranPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function BayaranPage({ searchParams }: BayaranPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const offset = (currentPage - 1) * ROWS_PER_PAGE;
  const [{ count: totalRecords }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "Payment"
  `;
  const [paymentStats] = await prisma.$queryRaw<PaymentStatsQueryRow[]>`
    WITH payment_arrears AS (
      SELECT a."totalArrearsAmount"
      FROM "Payment" p
      LEFT JOIN "Resident" r
        ON r."id" = p."residentId"
      LEFT JOIN LATERAL (
        SELECT arrears."totalArrearsAmount"
        FROM "ArrearsSummary" arrears
        INNER JOIN "Resident" arrears_resident
          ON arrears_resident."id" = arrears."residentId"
        WHERE arrears."residentId" = r."id"
          OR regexp_replace(arrears_resident."icNumber", '\\D', '', 'g') =
            regexp_replace(COALESCE(r."icNumber", ''), '\\D', '', 'g')
        ORDER BY
          CASE WHEN arrears."residentId" = r."id" THEN 0 ELSE 1 END,
          arrears."updatedAt" DESC
        LIMIT 1
      ) a
        ON TRUE
    )
    SELECT
      COUNT(*)::bigint AS "total",
      COUNT(*) FILTER (WHERE "totalArrearsAmount" = 0)::bigint AS "cukup",
      COUNT(*) FILTER (WHERE "totalArrearsAmount" > 0)::bigint AS "kurang",
      COUNT(*) FILTER (WHERE "totalArrearsAmount" < 0)::bigint AS "lebih",
      COUNT(*) FILTER (WHERE "totalArrearsAmount" IS NULL)::bigint AS "tidakLengkap"
    FROM payment_arrears
  `;
  const payments = await prisma.$queryRaw<PaymentQueryRow[]>`
    SELECT
      p."id",
      p."residentId",
      r."fullName",
      r."icNumber",
      qc."categoryName",
      u."unitCode",
      penghuni_record."nama" AS "extractedName",
      penghuni_record."noKadPengenalan" AS "extractedIcNumber",
      penghuni_record."kuarters" AS "extractedKuarters",
      penghuni_record."unit" AS "extractedUnit",
      qc."rentalPrice",
      qc."maintenancePrice",
      a."totalArrearsAmount",
      p."amount"
    FROM "Payment" p
    LEFT JOIN "Resident" r
      ON r."id" = p."residentId"
    LEFT JOIN LATERAL (
      SELECT o."unitId"
      FROM "UnitOccupancy" o
      INNER JOIN "Resident" occupancy_resident
        ON occupancy_resident."id" = o."residentId"
      WHERE (
          o."residentId" = r."id"
          OR regexp_replace(occupancy_resident."icNumber", '\\D', '', 'g') =
            regexp_replace(COALESCE(r."icNumber", ''), '\\D', '', 'g')
        )
        AND o."status" = 'CURRENT'::"OccupancyStatus"
      ORDER BY o."moveInDate" DESC
      LIMIT 1
    ) current_occupancy
      ON TRUE
    LEFT JOIN "Unit" u
      ON u."id" = current_occupancy."unitId"
    LEFT JOIN "QuarterCategory" qc
      ON qc."id" = u."categoryId"
    LEFT JOIN LATERAL (
      SELECT arrears."totalArrearsAmount"
      FROM "ArrearsSummary" arrears
      INNER JOIN "Resident" arrears_resident
        ON arrears_resident."id" = arrears."residentId"
      WHERE arrears."residentId" = r."id"
        OR regexp_replace(arrears_resident."icNumber", '\\D', '', 'g') =
          regexp_replace(COALESCE(r."icNumber", ''), '\\D', '', 'g')
      ORDER BY
        CASE WHEN arrears."residentId" = r."id" THEN 0 ELSE 1 END,
        arrears."updatedAt" DESC
      LIMIT 1
    ) a
      ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        record ->> 'nama' AS "nama",
        record ->> 'noKadPengenalan' AS "noKadPengenalan",
        record ->> 'kuarters' AS "kuarters",
        record ->> 'unit' AS "unit"
      FROM "UploadedDocument" d
      CROSS JOIN LATERAL jsonb_array_elements((d."remark"::jsonb) -> 'records') record
      WHERE d."category" = 'PENGHUNI'::"DocumentCategory"
        AND d."remark" IS NOT NULL
        AND (d."remark"::jsonb) ->> 'documentType' = 'penghuni'
        AND regexp_replace(record ->> 'noKadPengenalan', '\\D', '', 'g') =
          regexp_replace(COALESCE(r."icNumber", ''), '\\D', '', 'g')
      ORDER BY d."uploadedAt" DESC
      LIMIT 1
    ) penghuni_record
      ON TRUE
    ORDER BY
      CASE
        WHEN u."id" IS NOT NULL THEN 0
        WHEN NULLIF(penghuni_record."kuarters", '') IS NOT NULL
          AND NULLIF(penghuni_record."unit", '') IS NOT NULL THEN 1
        ELSE 2
      END,
      p."paymentDate" DESC,
      p."createdAt" DESC
    LIMIT ${ROWS_PER_PAGE}
    OFFSET ${offset}
  `;

  const rows = payments.map((payment): BayaranRow => {
    const paymentAmount = Number(payment.amount);
    const arrearsAmount =
      payment.totalArrearsAmount === null
        ? null
        : Number(payment.totalArrearsAmount);

    return {
      id: payment.id,
      name: payment.fullName ?? payment.extractedName ?? "N/A",
      ic: payment.icNumber ?? payment.extractedIcNumber ?? "N/A",
      quarters: payment.categoryName ?? payment.extractedKuarters ?? "N/A",
      unit: payment.unitCode ?? payment.extractedUnit ?? "N/A",
      arrears: arrearsAmount === null ? "N/A" : formatMoney(arrearsAmount),
      amount: formatMoney(paymentAmount),
      tone: getPaymentTone(arrearsAmount),
    };
  });

  const stats = buildStats(paymentStats);
  const visibleRows = rows;
  const totalRecordCount = Number(totalRecords);
  const totalPages = Math.max(1, Math.ceil(totalRecordCount / ROWS_PER_PAGE));
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const firstVisibleRecord = totalRecordCount === 0 ? 0 : offset + 1;
  const lastVisibleRecord = Math.min(offset + visibleRows.length, totalRecordCount);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <section className="min-h-full bg-background pb-4 pt-2 text-[#111827]">
      <div className="flex w-full flex-col gap-7">
        <div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-normal text-[#06152D]">
            Semakan Bayaran
          </h1>
          <p className="mt-1 text-xs font-medium text-[#667085]">
            Pengesahan potongan gaji bulanan melalui data perbendaharaan.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-5">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className={[
                "min-h-26 border-l-4 bg-white px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
                stat.accent,
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-extrabold uppercase text-[#667085]">
                  {stat.label}
                </p>
                <Icon icon={stat.icon} size={13} weight={600} className="text-[#A7B0C0]" />
              </div>
              <p className="mt-1 text-[28px] font-extrabold leading-none text-[#07162F]">
                {stat.value}
              </p>
              <p
                className={[
                  "mt-3 flex items-center gap-1 text-[9px] font-bold",
                  stat.helperColor,
                ].join(" ")}
              >
                <span className={["h-1.5 w-1.5 rounded-full", stat.dot].join(" ")} />
                {stat.helper}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-xl bg-light-blue p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold leading-tight text-[#07162F]">
                Senarai Rekod Bayaran
              </h2>
              <p className="text-xs font-medium text-[#344054]">
                Rekod bayaran terkini.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="text-[#8C97AA]"
                aria-label="Muat turun"
                suppressHydrationWarning
              >
                <Icon icon="download" size={17} weight={500} />
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded bg-dark-blue px-4 text-xs font-extrabold text-white shadow-[0_6px_12px_rgba(21,30,102,0.22)]"
                suppressHydrationWarning
              >
                <Icon icon="filter_alt" size={16} weight={600} />
                Penapis
              </button>
            </div>
          </div>

          <div className="relative rounded-t-xl bg-white px-6 pb-7 pt-5 shadow-sm">
            <span className="absolute right-9 top-[-11px] h-0 w-0 border-x-[12px] border-b-[12px] border-x-transparent border-b-white" />
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-6">
              <Field label="Nama" placeholder="Cth: Ahmad Zaki" />
              <Field label="No. K/P" placeholder="Cth: 850212-01-XXXX" />
              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-extrabold uppercase text-[#667085]">
                  Kelas Kuarters
                </span>
                <select
                  className="h-9 rounded border border-[#E2E7F1] bg-[#F3F6FC] px-3 text-[11px] font-semibold text-[#4B5567] outline-none"
                  suppressHydrationWarning
                >
                  <option>Semua Kelas</option>
                </select>
              </label>
              <Field label="Unit Kuarters" placeholder="Cth: Blok A-01-01" />
            </div>

            <div className="mt-7 flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {checks.map(([label, color]) => (
                  <label
                    key={label}
                    className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#172033]"
                  >
                    <span
                      className={[
                        "flex h-3.5 w-3.5 items-center justify-center rounded-[2px] text-white",
                        color,
                      ].join(" ")}
                    >
                      <Icon icon="check" size={11} weight={700} />
                    </span>
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-7">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#667085]"
                  suppressHydrationWarning
                >
                  Set Semula
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 min-w-29 items-center justify-center gap-2 rounded bg-dark-blue px-5 text-xs font-extrabold text-white shadow-[0_8px_14px_rgba(21,30,102,0.22)]"
                  suppressHydrationWarning
                >
                  <Icon icon="search" size={15} weight={600} />
                  Cari
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-b-xl bg-white shadow-sm">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-[#F6F8FD] text-[9px] font-extrabold uppercase tracking-[0.06em] text-[#667085]">
                <tr>
                  <th className="w-[26%] px-8 py-5">Penghuni</th>
                  <th className="w-[22%] px-6 py-5">Kuarters</th>
                  <th className="w-[17%] px-6 py-5 text-center">
                    Tunggakan
                    <br />
                    (RM)
                  </th>
                  <th className="w-[22%] px-6 py-5 text-right">
                    Amaun Bayar Bulan Kini
                    <br />
                    (RM)
                  </th>
                  <th className="w-[13%] px-7 py-5 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F7] text-xs">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-sm font-semibold text-[#667085]"
                    >
                      Tiada rekod bayaran lengkap ditemui.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                  <tr key={row.id} className={["h-20 border-l-4", rowBorder(row.tone)].join(" ")}>
                    <td className="px-8 py-4">
                      <p className="font-extrabold leading-tight text-[#172033]">
                        {row.name}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-[#667085]">
                        {row.ic}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-extrabold leading-tight text-[#172033]">
                        {row.quarters}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-[#667085]">
                        {row.unit}
                      </p>
                    </td>
                    <td className={["px-6 py-4 text-center font-bold", rowText(row.tone)].join(" ")}>
                      {row.arrears}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-[#172033]">
                      {row.amount}
                    </td>
                    <td className="px-7 py-4">
                      <div className="flex items-center justify-center gap-6 text-dark-blue">
                        <button type="button" aria-label="Lihat" suppressHydrationWarning>
                          <Icon icon="visibility" size={16} weight={600} />
                        </button>
                        <button type="button" aria-label="Tambah" suppressHydrationWarning>
                          <Icon icon="add" size={18} weight={700} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-[#EEF1F7] px-6 py-4 text-[11px] font-semibold text-[#344054]">
              <div className="flex items-center gap-2">
                <PaginationLink
                  page={Math.max(1, currentPage - 1)}
                  disabled={!canGoPrevious}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#667085] aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                >
                  <Icon icon="chevron_left" size={15} weight={600} />
                </PaginationLink>
                {visiblePages.map((page, index) =>
                  page === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="px-1 text-[#98A2B3]">
                      ...
                    </span>
                  ) : (
                    <PaginationLink
                      key={page}
                      page={page}
                      className={[
                        "flex h-7 min-w-7 items-center justify-center rounded px-2",
                        page === currentPage
                          ? "bg-dark-blue text-white"
                          : "text-[#344054]",
                      ].join(" ")}
                    >
                      {page}
                    </PaginationLink>
                  ),
                )}
                <PaginationLink
                  page={Math.min(totalPages, currentPage + 1)}
                  disabled={!canGoNext}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#667085] aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                >
                  <Icon icon="chevron_right" size={15} weight={600} />
                </PaginationLink>
              </div>
              <p>
                Menunjukkan {firstVisibleRecord}-{lastVisibleRecord} Daripada{" "}
                {totalRecordCount.toLocaleString("ms-MY")} Rekod
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaginationLink({
  page,
  disabled = false,
  className,
  children,
}: {
  page: number;
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/pages/3_bayaran?page=${page}`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={className}
      suppressHydrationWarning
    >
      {children}
    </Link>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages] as const;
}

function buildStats(stats: PaymentStatsQueryRow) {
  const values = [
    stats.total,
    stats.cukup,
    stats.kurang,
    stats.lebih,
    stats.tidakLengkap,
  ];

  return statTemplates.map((stat, index) => ({
    ...stat,
    value: Number(values[index]).toLocaleString("ms-MY"),
  }));
}

function getPaymentTone(arrearsAmount: number | null): PaymentStatus {
  if (arrearsAmount === null || !Number.isFinite(arrearsAmount)) {
    return "purple";
  }

  if (arrearsAmount < 0) {
    return "blue";
  }

  if (arrearsAmount > 0) {
    return "red";
  }

  return "green";
}

function formatMoney(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[9px] font-extrabold uppercase text-[#667085]">
        {label}
      </span>
      <input
        className="h-9 rounded border border-[#E2E7F1] bg-[#F3F6FC] px-3 text-[11px] font-semibold text-[#4B5567] outline-none placeholder:text-[#8A94A6]"
        placeholder={placeholder}
        suppressHydrationWarning
      />
    </label>
  );
}

function rowBorder(tone: string) {
  if (tone === "green") return "border-l-cukup";
  if (tone === "red") return "border-l-kurang";
  if (tone === "blue") return "border-l-lebih";
  return "border-l-x-lengkap";
}

function rowText(tone: string) {
  if (tone === "green") return "text-cukup";
  if (tone === "red") return "text-kurang";
  if (tone === "blue") return "text-lebih";
  return "text-x-lengkap";
}
