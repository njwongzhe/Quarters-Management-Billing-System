import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ROUTES } from "@/app/constants/routes";
import {
  formatAuditTarget,
  formatAuditValue,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
  getMonthStartInAppTimeZone,
  parseDateOnlyInAppTimeZone,
} from "@/lib/date-time";
import { createPaymentRecords } from "@/lib/payments/payment-creation";
import type { ManualPaymentMutationResult } from "@/lib/payments/bayaran-types";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ManualPaymentInput = {
  paymentDate: Date;
  receiptNo: string | null;
  amount: number;
  description: string;
};

type ManualPaymentLookupClient = Pick<
  Prisma.TransactionClient,
  "$executeRaw" | "payment"
>;

class DuplicateManualPaymentError extends Error {
  constructor(readonly recordIndex: number) {
    super(`Rekod bayaran #${recordIndex + 1} telah wujud dalam sistem.`);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Sila log masuk semula." },
        { status: 401 },
      );
    }

    const resident = await resolvePaymentResident(id);

    if (!resident) {
      return NextResponse.json(
        { success: false, message: "Rekod penghuni tidak ditemui." },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsedRecords = parseManualPaymentRecords(body);

    if (!parsedRecords.ok) {
      return NextResponse.json(
        { success: false, message: parsedRecords.message },
        { status: 400 },
      );
    }

    const duplicateRecordIndex = findDuplicateManualPaymentIndex(
      resident.id,
      parsedRecords.records,
    );

    if (duplicateRecordIndex !== null) {
      return NextResponse.json(
        {
          success: false,
          message: `Rekod bayaran #${duplicateRecordIndex + 1} berulang dalam senarai bayaran ditambah.`,
        },
        { status: 400 },
      );
    }

    const paymentIds = await prisma.$transaction(async (tx) => {
      await lockManualPaymentResident(tx, resident.id);

      const existingDuplicateIndex = await findExistingManualPaymentIndex(
        tx,
        resident.id,
        parsedRecords.records,
      );

      if (existingDuplicateIndex !== null) {
        throw new DuplicateManualPaymentError(existingDuplicateIndex);
      }

      const createdPaymentIds = await createPaymentRecords(
        tx,
        parsedRecords.records.map((record) => ({
          residentId: resident.id,
          paymentDate: record.paymentDate,
          receiptNo: record.receiptNo,
          amount: record.amount,
          description: record.description,
          source: "manual",
          createdById: currentAdmin.profile.id,
          verifiedById: currentAdmin.profile.id,
        })),
      );

      const totalAmount = parsedRecords.records.reduce(
        (sum, record) => sum + record.amount,
        0,
      );

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Semakan Bayaran",
        actionType: "CREATE",
        target: formatAuditTarget([
          resident.fullName,
          `No. KP ${resident.icNumber}`,
        ]),
        entityType: "PAYMENT",
        entityId: null,
        summary: `Menambah ${parsedRecords.records.length} rekod bayaran manual.`,
        details: [
          `Jumlah bayaran ditambah: RM ${totalAmount.toFixed(2)}.`,
          `Tarikh bayaran: ${parsedRecords.records
            .map((record) => formatAuditValue(record.paymentDate))
            .join(", ")}.`,
          `No. resit: ${parsedRecords.records
            .map((record) => formatAuditValue(record.receiptNo))
            .join(", ")}.`,
        ],
      });

      return createdPaymentIds;
    });

    const paymentMonth = getPaymentMonthFromRequest(request);
    const result: ManualPaymentMutationResult = {
      residentId: resident.id,
      totalAmount: parsedRecords.records.reduce(
        (sum, record) => sum + record.amount,
        0,
      ),
      amountThisMonthDelta: parsedRecords.records.reduce(
        (sum, record) =>
          getMonthStartInAppTimeZone(record.paymentDate).getTime() ===
          paymentMonth.getTime()
            ? sum + record.amount
            : sum,
        0,
      ),
    };

    revalidatePath(ROUTES.bayaran);
    revalidatePath(ROUTES.transaksi);

    return NextResponse.json({
      success: true,
      message: "Bayaran manual berjaya disimpan.",
      data: {
        result,
        paymentIds,
      },
    });
  } catch (error) {
    if (error instanceof DuplicateManualPaymentError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 },
      );
    }

    console.error("Gagal menyimpan bayaran manual:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Ralat pelayan berlaku semasa menyimpan bayaran manual.",
      },
      { status: 500 },
    );
  }
}

async function resolvePaymentResident(recordId: string) {
  const residents = await prisma.$queryRaw<
    { id: string; fullName: string; icNumber: string }[]
  >(Prisma.sql`
    SELECT resident.id, resident."fullName", resident."icNumber"
    FROM "Resident" AS resident
    WHERE resident.id = ${recordId}::uuid

    UNION ALL

    SELECT resident.id, resident."fullName", resident."icNumber"
    FROM "Payment" AS payment
    INNER JOIN "Resident" AS resident
      ON resident.id = payment."residentId"
    WHERE payment.id = ${recordId}::uuid

    LIMIT 1
  `);

  return residents[0] ?? null;
}

function getPaymentMonthFromRequest(request: Request) {
  const monthValue = new URL(request.url).searchParams.get("paymentMonth");

  if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
    const parsedMonth = parseDateOnlyInAppTimeZone(`${monthValue}-01`);

    if (parsedMonth) {
      return parsedMonth;
    }
  }

  return getMonthStartInAppTimeZone();
}

function parseManualPaymentRecords(body: unknown):
  | { ok: true; records: ManualPaymentInput[] }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      message: "Data bayaran manual tidak sah.",
    };
  }

  const payload = body as Record<string, unknown>;
  const records = payload.records;

  if (!Array.isArray(records) || records.length === 0) {
    return {
      ok: false,
      message: "Sila tambah sekurang-kurangnya satu rekod bayaran.",
    };
  }

  const parsedRecords: ManualPaymentInput[] = [];

  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return {
        ok: false,
        message: `Rekod bayaran #${index + 1} tidak sah.`,
      };
    }

    const row = record as Record<string, unknown>;
    const paymentDate = parsePaymentDate(row.paymentDate);

    if (!paymentDate) {
      return {
        ok: false,
        message: `Sila pilih tarikh untuk rekod bayaran #${index + 1}.`,
      };
    }

    const amount = parsePaymentAmount(row.amount);

    if (amount === null || amount <= 0) {
      return {
        ok: false,
        message: `Amaun untuk rekod bayaran #${index + 1} mesti lebih daripada 0.`,
      };
    }

    parsedRecords.push({
      paymentDate,
      receiptNo: normalizeOptionalText(row.receiptNo),
      amount,
      description: normalizeOptionalText(row.description) ?? "bayaran",
    });
  }

  return {
    ok: true,
    records: parsedRecords,
  };
}

function parsePaymentDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return parseDateOnlyInAppTimeZone(value);
}

function parsePaymentAmount(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/,/g, "").trim());

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Number(amount.toFixed(2));
}

function findDuplicateManualPaymentIndex(
  residentId: string,
  records: ManualPaymentInput[],
) {
  const seenKeys = new Set<string>();

  for (const [index, record] of records.entries()) {
    const key = getManualPaymentKey(residentId, record);

    if (seenKeys.has(key)) {
      return index;
    }

    seenKeys.add(key);
  }

  return null;
}

async function findExistingManualPaymentIndex(
  client: ManualPaymentLookupClient,
  residentId: string,
  records: ManualPaymentInput[],
) {
  const recordsByKey = new Map(
    records.map((record, index) => [getManualPaymentKey(residentId, record), index]),
  );
  const paymentDates = uniqueDates(records.map((record) => record.paymentDate));
  const existingPayments = await client.payment.findMany({
    where: {
      residentId,
      paymentDate: {
        in: paymentDates,
      },
    },
    select: {
      paymentDate: true,
      receiptNo: true,
      amount: true,
    },
  });

  for (const payment of existingPayments) {
    const key = getManualPaymentKey(residentId, {
      paymentDate: payment.paymentDate,
      receiptNo: payment.receiptNo,
      amount: Number(payment.amount),
      description: "",
    });
    const index = recordsByKey.get(key);

    if (index !== undefined) {
      return index;
    }
  }

  return null;
}

async function lockManualPaymentResident(
  client: ManualPaymentLookupClient,
  residentId: string,
) {
  await client.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`manual-payment-${residentId}`}))`,
  );
}

function getManualPaymentKey(residentId: string, record: ManualPaymentInput) {
  return [
    residentId,
    record.paymentDate.toISOString(),
    normalizeDuplicateText(record.receiptNo),
    record.amount.toFixed(2),
  ].join("|");
}

function uniqueDates(values: Date[]) {
  const dateByKey = new Map<string, Date>();

  for (const value of values) {
    dateByKey.set(value.toISOString(), value);
  }

  return [...dateByKey.values()];
}

function normalizeDuplicateText(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(value: unknown) {
  const normalizedValue = String(value ?? "").replace(/\s+/g, " ").trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}
