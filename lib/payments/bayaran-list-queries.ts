import { Prisma } from "@prisma/client";

import {
  getAppTimeZoneDateParts,
  getMonthStartInAppTimeZone,
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import type {
  PaymentQueryRow,
  PaymentStatsQueryRow,
} from "@/lib/payments/bayaran-types";

export async function getBayaranPaymentListData(paymentMonth = new Date()) {
  const selectedMonthStart = getMonthStart(paymentMonth);
  const selectedNextMonthStart = getNextMonthStart(selectedMonthStart);
  const [statsRows, rows] = await Promise.all([
    prisma.$queryRaw<PaymentStatsQueryRow[]>`
      WITH ${bayaranResidentsCte(selectedMonthStart, selectedNextMonthStart)}
      SELECT
        COUNT(*)::bigint AS "total",
        COUNT(*) FILTER (
          WHERE r."status" <> 'DATA_TIDAK_LENGKAP'::"ResidentStatus"
            AND COALESCE(a."totalArrearsAmount", 0) = 0
        )::bigint AS "cukup",
        COUNT(*) FILTER (
          WHERE r."status" <> 'DATA_TIDAK_LENGKAP'::"ResidentStatus"
            AND COALESCE(a."totalArrearsAmount", 0) > 0
        )::bigint AS "kurang",
        COUNT(*) FILTER (
          WHERE r."status" <> 'DATA_TIDAK_LENGKAP'::"ResidentStatus"
            AND COALESCE(a."totalArrearsAmount", 0) < 0
        )::bigint AS "lebih",
        COUNT(*) FILTER (
          WHERE r."status" = 'DATA_TIDAK_LENGKAP'::"ResidentStatus"
        )::bigint AS "tidakLengkap"
      FROM bayaran_residents p
      ${bayaranPaymentBaseJoins()}
    `,
    prisma.$queryRaw<PaymentQueryRow[]>`
      WITH ${bayaranResidentsCte(selectedMonthStart, selectedNextMonthStart)}
      SELECT
        p."id",
        p."residentId",
        r."fullName",
        r."icNumber",
        r."status" AS "residentStatus",
        qc."categoryName",
        qc."address" AS "categoryAddress",
        u."unitCode",
        penghuni_record."nama" AS "extractedName",
        penghuni_record."noKadPengenalan" AS "extractedIcNumber",
        penghuni_record."kuarters" AS "extractedKuarters",
        penghuni_record."unit" AS "extractedUnit",
        a."totalArrearsAmount",
        p."amount"
      FROM bayaran_residents p
      ${bayaranPaymentBaseJoins()}
      ORDER BY
        p."paymentDate" DESC NULLS LAST,
        r."fullName" ASC,
        p."createdAt" DESC NULLS LAST
    `,
  ]);

  return {
    rows,
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

function bayaranResidentsCte(monthStart: Date, nextMonthStart: Date) {
  return Prisma.sql`
    bayaran_residents AS (
      SELECT
        r."id",
        r."id" AS "residentId",
        latest_payment."paymentDate",
        latest_payment."createdAt",
        COALESCE(monthly_payment."amount", 0) AS "amount"
      FROM "Resident" r
      LEFT JOIN LATERAL (
        SELECT
          p."paymentDate",
          p."createdAt"
        FROM "Payment" p
        WHERE p."residentId" = r."id"
        ORDER BY
          p."paymentDate" DESC,
          p."createdAt" DESC,
          p."id" DESC
        LIMIT 1
      ) latest_payment
        ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(monthly_payment."amount") AS "amount"
        FROM "Payment" monthly_payment
        WHERE monthly_payment."residentId" = r."id"
          AND monthly_payment."paymentDate" >= ${monthStart}
          AND monthly_payment."paymentDate" < ${nextMonthStart}
      ) monthly_payment
        ON TRUE
    )
  `;
}

function getMonthStart(value: Date) {
  return getMonthStartInAppTimeZone(value);
}

function getNextMonthStart(value: Date) {
  const { year, month } = getAppTimeZoneDateParts(value);

  return new Date(Date.UTC(year, month, 1));
}

function bayaranPaymentBaseJoins() {
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
