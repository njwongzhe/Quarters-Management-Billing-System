import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ROUTES } from "@/app/constants/routes";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { getBayaranPaymentDetail } from "@/lib/payments/bayaran-detail";
import { createPaymentRecords } from "@/lib/payments/payment-creation";
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

    const residentId = await resolvePaymentResidentId(id);

    if (!residentId) {
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
      residentId,
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

    await prisma.$transaction(async (tx) => {
      await lockManualPaymentResident(tx, residentId);

      const existingDuplicateIndex = await findExistingManualPaymentIndex(
        tx,
        residentId,
        parsedRecords.records,
      );

      if (existingDuplicateIndex !== null) {
        throw new DuplicateManualPaymentError(existingDuplicateIndex);
      }

      await createPaymentRecords(
        tx,
        parsedRecords.records.map((record) => ({
          residentId,
          paymentDate: record.paymentDate,
          receiptNo: record.receiptNo,
          amount: record.amount,
          description: record.description,
          source: "manual",
          createdById: currentAdmin.profile.id,
          verifiedById: currentAdmin.profile.id,
        })),
      );
    });

    const payment = await getBayaranPaymentDetail(id);

    revalidatePath(ROUTES.bayaran);
    revalidatePath(ROUTES.transaksi);

    return NextResponse.json({
      success: true,
      message: "Bayaran manual berjaya disimpan.",
      data: {
        payment,
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

async function resolvePaymentResidentId(recordId: string) {
  const resident = await prisma.resident.findUnique({
    where: { id: recordId },
    select: { id: true },
  });

  if (resident) {
    return resident.id;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: recordId },
    select: { residentId: true },
  });

  return payment?.residentId ?? null;
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

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
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
