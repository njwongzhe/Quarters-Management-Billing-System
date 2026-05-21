import Icon from "@/app/components/Icon/Icon";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import BayaranDownload, {
  type BayaranExportRow,
} from "./components/BayaranDownload";
import BayaranFilterShell from "./components/BayaranFilterShell";
import BayaranRowActions from "./components/BayaranRowActions";

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

const statusFilters = [
  {
    label: "Cukup Bayaran",
    value: "cukup",
    checkedClass: "peer-checked:bg-cukup",
  },
  {
    label: "Kurang Bayaran",
    value: "kurang",
    checkedClass: "peer-checked:bg-kurang",
  },
  {
    label: "Lebihan Bayaran",
    value: "lebih",
    checkedClass: "peer-checked:bg-lebih",
  },
  {
    label: "Data Tidak Lengkap",
    value: "tidak-lengkap",
    checkedClass: "peer-checked:bg-x-lengkap",
  },
] as const;

type BayaranStatusFilter = (typeof statusFilters)[number]["value"];

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
    nama?: string;
    ic?: string;
    kelas?: string;
    unit?: string;
    status?: string | string[];
    statusMode?: string;
  }>;
};

type BayaranFilters = {
  nama: string;
  ic: string;
  kelas: string;
  unit: string;
  statuses: BayaranStatusFilter[];
  statusMode: boolean;
};

export default async function BayaranPage({ searchParams }: BayaranPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseBayaranFilters(resolvedSearchParams);
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const offset = (currentPage - 1) * ROWS_PER_PAGE;
  const filterWhere = buildPaymentFilterWhere(filters);
  const [
    quarterOptions,
    { rows: payments, totalRecords, paymentStats },
    exportPayments,
  ] = await Promise.all([
    getQuarterOptions(),
    getFilteredPaymentPage(filterWhere, offset),
    getPaymentExportRows(filterWhere),
  ]);
  const rows = payments.map(mapPaymentRow);
  const exportRows = exportPayments.map(mapPaymentExportRow);

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
                "min-h-26 rounded-lg border-l-4 bg-white px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
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

        <BayaranFilterShell
          downloadButton={<BayaranDownload exportRows={exportRows} />}
          filterForm={(
            <form
              action="/pages/3_bayaran"
              className="relative rounded-t-xl bg-white px-6 pb-7 pt-5 shadow-sm"
            >
              <span className="absolute right-2 top-[-11px] h-0 w-0 border-x-[12px] border-b-[12px] border-x-transparent border-b-white" />
              <input type="hidden" name="statusMode" value="1" />
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-6">
                <Field
                  name="nama"
                  label="Nama"
                  placeholder="Cth: Ahmad Zaki"
                  defaultValue={filters.nama}
                />
                <Field
                  name="ic"
                  label="No. K/P"
                  placeholder="Cth: 850212-01-XXXX"
                  defaultValue={filters.ic}
                />
                <label className="flex flex-col gap-2">
                  <span className="text-[9px] font-extrabold uppercase text-[#667085]">
                    Kelas Kuarters
                  </span>
                  <select
                    name="kelas"
                    defaultValue={filters.kelas}
                    className="h-9 rounded border border-[#E2E7F1] bg-[#F3F6FC] px-3 text-[11px] font-semibold text-[#4B5567] outline-none"
                    suppressHydrationWarning
                  >
                    <option value="">Semua Kelas</option>
                    {quarterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="unit"
                  label="Unit Kuarters"
                  placeholder="Cth: Blok A-01-01"
                  defaultValue={filters.unit}
                />
              </div>

              <div className="mt-7 flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {statusFilters.map((status) => (
                    <label
                      key={status.value}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-extrabold text-[#172033]"
                    >
                      <input
                        type="checkbox"
                        name="status"
                        value={status.value}
                        defaultChecked={isStatusChecked(filters, status.value)}
                        className="peer sr-only"
                      />
                      <span
                        className={[
                          "flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-[#D0D5DD] bg-white text-transparent transition-colors peer-checked:border-transparent peer-checked:text-white",
                          status.checkedClass,
                        ].join(" ")}
                      >
                        <Icon icon="check" size={11} weight={700} />
                      </span>
                      {status.label}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-7">
                  <Link
                    href="/pages/3_bayaran"
                    className="text-[11px] font-semibold text-[#667085]"
                    suppressHydrationWarning
                  >
                    Set Semula
                  </Link>
                  <button
                    type="submit"
                    className="inline-flex h-10 min-w-29 items-center justify-center gap-2 rounded bg-dark-blue px-5 text-xs font-extrabold text-white shadow-[0_8px_14px_rgba(21,30,102,0.22)]"
                    suppressHydrationWarning
                  >
                    <Icon icon="search" size={15} weight={600} />
                    Cari
                  </button>
                </div>
              </div>
            </form>
          )}
        >
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
                      <BayaranRowActions paymentId={row.id} />
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-[#EEF1F7] px-6 py-4 text-[11px] font-semibold text-[#344054]">
              <div className="flex items-center gap-2">
                <PaginationLink
                  page={Math.max(1, currentPage - 1)}
                  filters={filters}
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
                      filters={filters}
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
                  filters={filters}
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
        </BayaranFilterShell>
      </div>
    </section>
  );
}

async function getQuarterOptions() {
  const rows = await prisma.$queryRaw<{ categoryName: string }[]>`
    SELECT DISTINCT "categoryName"
    FROM "QuarterCategory"
    WHERE NULLIF(TRIM("categoryName"), '') IS NOT NULL
    ORDER BY "categoryName" ASC
  `;

  return rows.map((row) => row.categoryName);
}

async function getFilteredPaymentPage(filterWhere: Prisma.Sql, offset: number) {
  const [totalRows, statsRows, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      WITH ${latestPaymentsCte()}
      SELECT COUNT(*)::bigint AS "count"
      FROM latest_payments p
      ${paymentBaseJoins()}
      ${filterWhere}
    `),
    prisma.$queryRaw<PaymentStatsQueryRow[]>(Prisma.sql`
      WITH ${latestPaymentsCte()}
      SELECT
        COUNT(*)::bigint AS "total",
        COUNT(*) FILTER (WHERE a."totalArrearsAmount" = 0)::bigint AS "cukup",
        COUNT(*) FILTER (WHERE a."totalArrearsAmount" > 0)::bigint AS "kurang",
        COUNT(*) FILTER (WHERE a."totalArrearsAmount" < 0)::bigint AS "lebih",
        COUNT(*) FILTER (WHERE a."totalArrearsAmount" IS NULL)::bigint AS "tidakLengkap"
      FROM latest_payments p
      ${paymentBaseJoins()}
      ${filterWhere}
    `),
    prisma.$queryRaw<PaymentQueryRow[]>(Prisma.sql`
      WITH ${latestPaymentsCte()}
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
      FROM latest_payments p
      ${paymentBaseJoins()}
      ${filterWhere}
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
    `),
  ]);

  return {
    rows,
    totalRecords: totalRows[0]?.count ?? BigInt(0),
    paymentStats:
      statsRows[0] ?? {
        total: BigInt(0),
        cukup: BigInt(0),
        kurang: BigInt(0),
        lebih: BigInt(0),
        tidakLengkap: BigInt(0),
      },
  };
}

async function getPaymentExportRows(filterWhere: Prisma.Sql) {
  return prisma.$queryRaw<PaymentQueryRow[]>(Prisma.sql`
    WITH ${latestPaymentsCte()}
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
    FROM latest_payments p
    ${paymentBaseJoins()}
    ${filterWhere}
    ORDER BY
      CASE
        WHEN u."id" IS NOT NULL THEN 0
        WHEN NULLIF(penghuni_record."kuarters", '') IS NOT NULL
          AND NULLIF(penghuni_record."unit", '') IS NOT NULL THEN 1
        ELSE 2
      END,
      p."paymentDate" DESC,
      p."createdAt" DESC
  `);
}

function latestPaymentsCte() {
  return Prisma.sql`
    latest_payments AS (
      SELECT DISTINCT ON (p."residentId")
        p."id",
        p."residentId",
        p."paymentDate",
        p."createdAt",
        p."amount"
      FROM "Payment" p
      WHERE p."residentId" IS NOT NULL
      ORDER BY
        p."residentId",
        p."paymentDate" DESC,
        p."createdAt" DESC,
        p."id" DESC
    )
  `;
}

function paymentBaseJoins() {
  return Prisma.sql`
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
  `;
}

function buildPaymentFilterWhere(filters: BayaranFilters) {
  const conditions: Prisma.Sql[] = [];
  const normalizedIc = filters.ic.replace(/\D/g, "");

  if (filters.nama) {
    conditions.push(Prisma.sql`
      COALESCE(r."fullName", penghuni_record."nama", '') ILIKE ${toLikePattern(filters.nama)}
      ESCAPE '\\'
    `);
  }

  if (normalizedIc) {
    conditions.push(Prisma.sql`
      regexp_replace(
        COALESCE(r."icNumber", penghuni_record."noKadPengenalan", ''),
        '\\D',
        '',
        'g'
      ) LIKE ${`%${normalizedIc}%`}
    `);
  }

  if (filters.kelas) {
    conditions.push(Prisma.sql`
      LOWER(COALESCE(qc."categoryName", penghuni_record."kuarters", '')) =
      LOWER(${filters.kelas})
    `);
  }

  if (filters.unit) {
    conditions.push(Prisma.sql`
      COALESCE(u."unitCode", penghuni_record."unit", '') ILIKE ${toLikePattern(filters.unit)}
      ESCAPE '\\'
    `);
  }

  const statusCondition = buildStatusFilterCondition(filters);

  if (statusCondition) {
    conditions.push(statusCondition);
  }

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

function buildStatusFilterCondition(filters: BayaranFilters) {
  if (!filters.statusMode) {
    return null;
  }

  if (filters.statuses.length === 0) {
    return Prisma.sql`false`;
  }

  if (filters.statuses.length === statusFilters.length) {
    return null;
  }

  const conditions = filters.statuses.map((status) => {
    if (status === "cukup") {
      return Prisma.sql`a."totalArrearsAmount" = 0`;
    }

    if (status === "kurang") {
      return Prisma.sql`a."totalArrearsAmount" > 0`;
    }

    if (status === "lebih") {
      return Prisma.sql`a."totalArrearsAmount" < 0`;
    }

    return Prisma.sql`a."totalArrearsAmount" IS NULL`;
  });

  return Prisma.sql`(${Prisma.join(conditions, " OR ")})`;
}

function parseBayaranFilters(
  searchParams: Awaited<BayaranPageProps["searchParams"]> | undefined,
): BayaranFilters {
  return {
    nama: getStringParam(searchParams?.nama),
    ic: getStringParam(searchParams?.ic),
    kelas: getStringParam(searchParams?.kelas),
    unit: getStringParam(searchParams?.unit),
    statuses: getArrayParam(searchParams?.status).filter(isBayaranStatusFilter),
    statusMode: getStringParam(searchParams?.statusMode) === "1",
  };
}

function getStringParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return String(rawValue ?? "").replace(/\s+/g, " ").trim();
}

function getArrayParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.map(getStringParam).filter(Boolean);
  }

  const normalizedValue = getStringParam(value);

  return normalizedValue ? [normalizedValue] : [];
}

function isBayaranStatusFilter(value: string): value is BayaranStatusFilter {
  return statusFilters.some((status) => status.value === value);
}

function isStatusChecked(filters: BayaranFilters, value: BayaranStatusFilter) {
  if (!filters.statusMode && filters.statuses.length === 0) {
    return true;
  }

  return filters.statuses.includes(value);
}

function toLikePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

function buildBayaranQueryString(filters: BayaranFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.nama) params.set("nama", filters.nama);
  if (filters.ic) params.set("ic", filters.ic);
  if (filters.kelas) params.set("kelas", filters.kelas);
  if (filters.unit) params.set("unit", filters.unit);

  if (filters.statusMode) {
    params.set("statusMode", "1");
    for (const status of filters.statuses) {
      params.append("status", status);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

function PaginationLink({
  page,
  filters,
  disabled = false,
  className,
  children,
}: {
  page: number;
  filters: BayaranFilters;
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/pages/3_bayaran${buildBayaranQueryString(filters, page)}`}
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

function mapPaymentRow(payment: PaymentQueryRow): BayaranRow {
  const paymentAmount = normalizeAmount(payment.amount);
  const arrearsAmount = normalizeNullableAmount(payment.totalArrearsAmount);

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
}

function mapPaymentExportRow(payment: PaymentQueryRow): BayaranExportRow {
  const arrearsAmount = normalizeNullableAmount(payment.totalArrearsAmount);
  const amount = normalizeAmount(payment.amount);

  return {
    name: payment.fullName ?? payment.extractedName ?? "N/A",
    ic: payment.icNumber ?? payment.extractedIcNumber ?? "N/A",
    quarters: payment.categoryName ?? payment.extractedKuarters ?? "N/A",
    unit: payment.unitCode ?? payment.extractedUnit ?? "N/A",
    arrearsAmount,
    amount,
    status: getPaymentStatusLabel(arrearsAmount),
  };
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

function getPaymentStatusLabel(arrearsAmount: number | null) {
  if (arrearsAmount === null || !Number.isFinite(arrearsAmount)) {
    return "Data Tidak Lengkap";
  }

  if (arrearsAmount < 0) {
    return "Lebihan Bayaran";
  }

  if (arrearsAmount > 0) {
    return "Kurang Bayaran";
  }

  return "Cukup Bayaran";
}

function normalizeNullableAmount(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

function normalizeAmount(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: number) {
  return value.toLocaleString("ms-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[9px] font-extrabold uppercase text-[#667085]">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
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
