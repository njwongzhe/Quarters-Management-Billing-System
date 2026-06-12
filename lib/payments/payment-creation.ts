import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { getMonthStartInAppTimeZone } from "@/lib/date-time";
import { generateTransactionNos } from "@/lib/transactions/transactions";

const UPLOADED_PAYMENT_DESCRIPTION = "Bayaran daripada muat naik.";
const MANUAL_PAYMENT_DESCRIPTION = "bayaran";

type PaymentRecordClient = Prisma.TransactionClient;
type SchemaClient = Pick<Prisma.TransactionClient, "$queryRaw">;

export type CreatePaymentRecordInput = {
  residentId: string;
  paymentDate: Date;
  receiptNo: string | null;
  amount: Prisma.Decimal | string | number;
  description?: string | null;
  uploadedDocumentId?: string | null;
  source?: "manual" | "uploaded";
  createdById?: string | null;
  verifiedById?: string | null;
};

type PreparedPaymentRow = {
  id: string;
  residentId: string;
  paymentDate: Date;
  receiptNo: string | null;
  amount: number;
  description: string;
  uploadedDocumentId: string | null;
  createdById: string | null;
  verifiedById: string | null;
  verifiedAt: Date | null;
};

type PreparedTransactionRow = {
  id: string;
  transactionNo: string;
  residentId: string;
  paymentId: string;
  transactionDate: Date;
  chargeMonth: Date;
  creditAmount: number;
  receiptNo: string | null;
  description: string;
  createdById: string | null;
};

type BalanceTableColumns = {
  monthlyCharge: Set<string>;
  arrearsSummary: Set<string>;
};

type PaymentSchemaColumns = BalanceTableColumns & {
  payment: Set<string>;
  transaction: Set<string>;
};

let paymentSchemaColumnsPromise: Promise<PaymentSchemaColumns> | null = null;

export async function createPaymentRecords(
  tx: PaymentRecordClient,
  entries: CreatePaymentRecordInput[],
) {
  if (entries.length === 0) {
    return [];
  }

  const [transactionNos, schemaColumns] =
    await Promise.all([
      generateTransactionNos(tx, entries.length),
      getPaymentSchemaColumns(tx),
    ]);

  const paymentRows = entries.map((entry): PreparedPaymentRow => {
    const baseDescription = normalizeOptionalPaymentText(entry.description);
    const isUploadedPayment = isUploadedPaymentEntry(entry);

    return {
      id: randomUUID(),
      residentId: entry.residentId,
      paymentDate: entry.paymentDate,
      receiptNo: normalizeReceiptNo(entry.receiptNo),
      amount: normalizePaymentAmount(entry.amount),
      description:
        baseDescription ??
        (isUploadedPayment
          ? UPLOADED_PAYMENT_DESCRIPTION
          : MANUAL_PAYMENT_DESCRIPTION),
      uploadedDocumentId: entry.uploadedDocumentId ?? null,
      createdById: entry.createdById ?? null,
      verifiedById: entry.verifiedById ?? null,
      verifiedAt: entry.verifiedById ? new Date() : null,
    };
  });
  const transactionRows = entries.map((entry, index): PreparedTransactionRow => {
    const baseDescription = normalizeOptionalPaymentText(entry.description);
    const description = isUploadedPaymentEntry(entry)
      ? withUploadedPaymentSource(baseDescription)
      : baseDescription ?? MANUAL_PAYMENT_DESCRIPTION;

    return {
      id: randomUUID(),
      transactionNo: transactionNos[index],
      residentId: entry.residentId,
      paymentId: paymentRows[index].id,
      transactionDate: entry.paymentDate,
      chargeMonth: getMonthStartInAppTimeZone(entry.paymentDate),
      creditAmount: normalizePaymentAmount(entry.amount),
      receiptNo: normalizeReceiptNo(entry.receiptNo),
      description,
      createdById: entry.createdById ?? null,
    };
  });

  await insertPaymentRows(tx, paymentRows, schemaColumns.payment);
  await insertTransactionRows(tx, transactionRows, schemaColumns.transaction);
  await applyPaymentsToResidentBalances(tx, entries, schemaColumns);

  return paymentRows.map((row) => row.id);
}

async function insertPaymentRows(
  tx: PaymentRecordClient,
  rows: PreparedPaymentRow[],
  columns: Set<string>,
) {
  if (rows.length === 0) {
    return;
  }

  const fields = [
    Prisma.sql`"id"`,
    Prisma.sql`"residentId"`,
    Prisma.sql`"paymentDate"`,
    Prisma.sql`"receiptNo"`,
    Prisma.sql`"amount"`,
    Prisma.sql`"description"`,
    Prisma.sql`"createdAt"`,
    Prisma.sql`"updatedAt"`,
  ];

  if (columns.has("uploadedDocumentId")) {
    fields.push(Prisma.sql`"uploadedDocumentId"`);
  }

  if (columns.has("createdById")) {
    fields.push(Prisma.sql`"createdById"`);
  }

  if (columns.has("verifiedById")) {
    fields.push(Prisma.sql`"verifiedById"`);
  }

  if (columns.has("verifiedAt")) {
    fields.push(Prisma.sql`"verifiedAt"`);
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Payment" (${Prisma.join(fields)})
    VALUES ${Prisma.join(
      rows.map((row) => {
        const values = [
          uuidSql(row.id),
          uuidSql(row.residentId),
          Prisma.sql`${row.paymentDate}`,
          Prisma.sql`${row.receiptNo}`,
          Prisma.sql`${row.amount}`,
          Prisma.sql`${row.description}`,
          Prisma.sql`now()`,
          Prisma.sql`now()`,
        ];

        if (columns.has("uploadedDocumentId")) {
          values.push(uuidSql(row.uploadedDocumentId));
        }

        if (columns.has("createdById")) {
          values.push(uuidSql(row.createdById));
        }

        if (columns.has("verifiedById")) {
          values.push(uuidSql(row.verifiedById));
        }

        if (columns.has("verifiedAt")) {
          values.push(Prisma.sql`${row.verifiedAt}`);
        }

        return Prisma.sql`(${Prisma.join(values)})`;
      }),
    )}
  `);
}

async function insertTransactionRows(
  tx: PaymentRecordClient,
  rows: PreparedTransactionRow[],
  columns: Set<string>,
) {
  if (rows.length === 0) {
    return;
  }

  const fields = [
    Prisma.sql`"id"`,
    Prisma.sql`"transactionNo"`,
    Prisma.sql`"residentId"`,
    Prisma.sql`"paymentId"`,
    Prisma.sql`"transactionDate"`,
    Prisma.sql`"category"`,
    Prisma.sql`"status"`,
    Prisma.sql`"debitAmount"`,
    Prisma.sql`"creditAmount"`,
    Prisma.sql`"receiptNo"`,
    Prisma.sql`"description"`,
    Prisma.sql`"createdAt"`,
    Prisma.sql`"updatedAt"`,
  ];

  if (columns.has("createdById")) {
    fields.push(Prisma.sql`"createdById"`);
  }

  if (columns.has("chargeMonth")) {
    fields.push(Prisma.sql`"chargeMonth"`);
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Transaction" (${Prisma.join(fields)})
    VALUES ${Prisma.join(
      rows.map((row) => {
        const values = [
          uuidSql(row.id),
          Prisma.sql`${row.transactionNo}`,
          uuidSql(row.residentId),
          uuidSql(row.paymentId),
          Prisma.sql`${row.transactionDate}`,
          Prisma.sql`'BAYARAN'::"TransactionCategory"`,
          Prisma.sql`'NORMAL'::"TransactionStatus"`,
          Prisma.sql`0`,
          Prisma.sql`${row.creditAmount}`,
          Prisma.sql`${row.receiptNo}`,
          Prisma.sql`${row.description}`,
          Prisma.sql`now()`,
          Prisma.sql`now()`,
        ];

        if (columns.has("createdById")) {
          values.push(uuidSql(row.createdById));
        }

        if (columns.has("chargeMonth")) {
          values.push(Prisma.sql`${row.chargeMonth}`);
        }

        return Prisma.sql`(${Prisma.join(values)})`;
      }),
    )}
  `);
}

async function applyPaymentsToResidentBalances(
  tx: PaymentRecordClient,
  entries: CreatePaymentRecordInput[],
  columns: BalanceTableColumns,
) {
  if (entries.length === 0) {
    return;
  }

  const residentIds = [...new Set(entries.map((entry) => entry.residentId))];
  const activeOccupancies = await tx.unitOccupancy.findMany({
    where: {
      residentId: { in: residentIds },
      status: "CURRENT",
    },
    orderBy: [{ residentId: "asc" }, { moveInDate: "desc" }],
    select: { residentId: true, unitId: true },
  });
  const activeUnitIdByResidentId = new Map<string, string>();

  for (const occupancy of activeOccupancies) {
    if (!activeUnitIdByResidentId.has(occupancy.residentId)) {
      activeUnitIdByResidentId.set(occupancy.residentId, occupancy.unitId);
    }
  }

  const monthlyRows = aggregateMonthlyPaymentRows(
    entries,
    activeUnitIdByResidentId,
  );
  const arrearsRows = aggregateArrearsPaymentRows(entries);

  await upsertMonthlyChargePayments(tx, monthlyRows, columns.monthlyCharge);
  await upsertArrearsSummaryPayments(tx, arrearsRows, columns.arrearsSummary);
}

type MonthlyPaymentBalanceRow = {
  residentId: string;
  unitId: string | null;
  chargeMonth: Date;
  amount: number;
  createdById: string | null;
  verifiedById: string | null;
  verifiedAt: Date | null;
};

type ArrearsPaymentBalanceRow = Omit<MonthlyPaymentBalanceRow, "unitId">;

async function upsertMonthlyChargePayments(
  tx: PaymentRecordClient,
  rows: MonthlyPaymentBalanceRow[],
  columns: Set<string>,
) {
  if (rows.length === 0) {
    return;
  }

  const fields = [
    Prisma.sql`"id"`,
    Prisma.sql`"residentId"`,
    Prisma.sql`"unitId"`,
    Prisma.sql`"chargeMonth"`,
    Prisma.sql`"paymentReceived"`,
    Prisma.sql`"balanceForMonth"`,
    Prisma.sql`"createdAt"`,
    Prisma.sql`"updatedAt"`,
  ];
  const updates = [
    Prisma.sql`"paymentReceived" = "MonthlyCharge"."paymentReceived" + EXCLUDED."paymentReceived"`,
    Prisma.sql`"balanceForMonth" = "MonthlyCharge"."balanceForMonth" - EXCLUDED."paymentReceived"`,
    Prisma.sql`"updatedAt" = now()`,
  ];

  if (columns.has("createdById")) {
    fields.push(Prisma.sql`"createdById"`);
  }

  if (columns.has("verifiedById")) {
    fields.push(Prisma.sql`"verifiedById"`);
    updates.push(
      Prisma.sql`"verifiedById" = COALESCE(EXCLUDED."verifiedById", "MonthlyCharge"."verifiedById")`,
    );
  }

  if (columns.has("verifiedAt")) {
    fields.push(Prisma.sql`"verifiedAt"`);
    updates.push(
      Prisma.sql`"verifiedAt" = COALESCE(EXCLUDED."verifiedAt", "MonthlyCharge"."verifiedAt")`,
    );
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "MonthlyCharge" (${Prisma.join(fields)})
    VALUES ${Prisma.join(
      rows.map((row) => {
        const values = [
          uuidSql(randomUUID()),
          uuidSql(row.residentId),
          uuidSql(row.unitId),
          Prisma.sql`${row.chargeMonth}`,
          Prisma.sql`${row.amount}`,
          Prisma.sql`${-row.amount}`,
          Prisma.sql`now()`,
          Prisma.sql`now()`,
        ];

        if (columns.has("createdById")) {
          values.push(uuidSql(row.createdById));
        }

        if (columns.has("verifiedById")) {
          values.push(uuidSql(row.verifiedById));
        }

        if (columns.has("verifiedAt")) {
          values.push(Prisma.sql`${row.verifiedAt}`);
        }

        return Prisma.sql`(${Prisma.join(values)})`;
      }),
    )}
    ON CONFLICT ("residentId", "chargeMonth") DO UPDATE SET
      ${Prisma.join(updates)}
  `);
}

async function upsertArrearsSummaryPayments(
  tx: PaymentRecordClient,
  rows: ArrearsPaymentBalanceRow[],
  columns: Set<string>,
) {
  if (rows.length === 0) {
    return;
  }

  const fields = [
    Prisma.sql`"id"`,
    Prisma.sql`"residentId"`,
    Prisma.sql`"totalArrearsAmount"`,
    Prisma.sql`"lastUpdatedMonth"`,
    Prisma.sql`"createdAt"`,
    Prisma.sql`"updatedAt"`,
  ];
  const updates = [
    Prisma.sql`"totalArrearsAmount" = "ArrearsSummary"."totalArrearsAmount" + EXCLUDED."totalArrearsAmount"`,
    Prisma.sql`"lastUpdatedMonth" = EXCLUDED."lastUpdatedMonth"`,
    Prisma.sql`"updatedAt" = now()`,
  ];

  if (columns.has("createdById")) {
    fields.push(Prisma.sql`"createdById"`);
  }

  if (columns.has("verifiedById")) {
    fields.push(Prisma.sql`"verifiedById"`);
    updates.push(
      Prisma.sql`"verifiedById" = COALESCE(EXCLUDED."verifiedById", "ArrearsSummary"."verifiedById")`,
    );
  }

  if (columns.has("verifiedAt")) {
    fields.push(Prisma.sql`"verifiedAt"`);
    updates.push(
      Prisma.sql`"verifiedAt" = COALESCE(EXCLUDED."verifiedAt", "ArrearsSummary"."verifiedAt")`,
    );
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "ArrearsSummary" (${Prisma.join(fields)})
    VALUES ${Prisma.join(
      rows.map((row) => {
        const values = [
          uuidSql(randomUUID()),
          uuidSql(row.residentId),
          Prisma.sql`${-row.amount}`,
          Prisma.sql`${row.chargeMonth}`,
          Prisma.sql`now()`,
          Prisma.sql`now()`,
        ];

        if (columns.has("createdById")) {
          values.push(uuidSql(row.createdById));
        }

        if (columns.has("verifiedById")) {
          values.push(uuidSql(row.verifiedById));
        }

        if (columns.has("verifiedAt")) {
          values.push(Prisma.sql`${row.verifiedAt}`);
        }

        return Prisma.sql`(${Prisma.join(values)})`;
      }),
    )}
    ON CONFLICT ("residentId") DO UPDATE SET
      ${Prisma.join(updates)}
  `);
}

function aggregateMonthlyPaymentRows(
  entries: CreatePaymentRecordInput[],
  activeUnitIdByResidentId: Map<string, string>,
) {
  const rowsByResidentMonth = new Map<string, MonthlyPaymentBalanceRow>();

  for (const entry of entries) {
    const chargeMonth = getMonthStartInAppTimeZone(entry.paymentDate);
    const key = `${entry.residentId}|${chargeMonth.toISOString()}`;
    const existing = rowsByResidentMonth.get(key);
    const amount = normalizePaymentAmount(entry.amount);

    if (existing) {
      existing.amount += amount;
      existing.createdById = entry.createdById ?? existing.createdById;
      existing.verifiedById = entry.verifiedById ?? existing.verifiedById;
      existing.verifiedAt = entry.verifiedById ? new Date() : existing.verifiedAt;
      continue;
    }

    rowsByResidentMonth.set(key, {
      residentId: entry.residentId,
      unitId: activeUnitIdByResidentId.get(entry.residentId) ?? null,
      chargeMonth,
      amount,
      createdById: entry.createdById ?? null,
      verifiedById: entry.verifiedById ?? null,
      verifiedAt: entry.verifiedById ? new Date() : null,
    });
  }

  return [...rowsByResidentMonth.values()];
}

function aggregateArrearsPaymentRows(entries: CreatePaymentRecordInput[]) {
  const rowsByResident = new Map<string, ArrearsPaymentBalanceRow>();

  for (const entry of entries) {
    const chargeMonth = getMonthStartInAppTimeZone(entry.paymentDate);
    const existing = rowsByResident.get(entry.residentId);
    const amount = normalizePaymentAmount(entry.amount);

    if (existing) {
      existing.amount += amount;
      existing.chargeMonth = chargeMonth;
      existing.createdById = entry.createdById ?? existing.createdById;
      existing.verifiedById = entry.verifiedById ?? existing.verifiedById;
      existing.verifiedAt = entry.verifiedById ? new Date() : existing.verifiedAt;
      continue;
    }

    rowsByResident.set(entry.residentId, {
      residentId: entry.residentId,
      chargeMonth,
      amount,
      createdById: entry.createdById ?? null,
      verifiedById: entry.verifiedById ?? null,
      verifiedAt: entry.verifiedById ? new Date() : null,
    });
  }

  return [...rowsByResident.values()];
}

function getPaymentSchemaColumns(client: SchemaClient) {
  if (!paymentSchemaColumnsPromise) {
    paymentSchemaColumnsPromise = loadPaymentSchemaColumns(client).catch(
      (error) => {
        paymentSchemaColumnsPromise = null;
        throw error;
      },
    );
  }

  return paymentSchemaColumnsPromise;
}

async function loadPaymentSchemaColumns(
  client: SchemaClient,
): Promise<PaymentSchemaColumns> {
  const rows = await client.$queryRaw<
    { table_name: string; column_name: string }[]
  >(Prisma.sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'Payment',
        'Transaction',
        'MonthlyCharge',
        'ArrearsSummary'
      )
  `);

  const columnsByTable = new Map<string, Set<string>>();

  for (const row of rows) {
    const columns = columnsByTable.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    columnsByTable.set(row.table_name, columns);
  }

  return {
    payment: columnsByTable.get("Payment") ?? new Set<string>(),
    transaction: columnsByTable.get("Transaction") ?? new Set<string>(),
    monthlyCharge:
      columnsByTable.get("MonthlyCharge") ?? new Set<string>(),
    arrearsSummary:
      columnsByTable.get("ArrearsSummary") ?? new Set<string>(),
  };
}

function normalizePaymentAmount(value: Prisma.Decimal | string | number) {
  return Number(Number(value).toFixed(2));
}

function normalizeReceiptNo(value: string | null | undefined) {
  const normalizedValue = String(value ?? "").replace(/\s+/g, " ").trim();

  return normalizedValue || null;
}

function normalizeOptionalPaymentText(value: string | null | undefined) {
  const normalizedValue = String(value ?? "").replace(/\s+/g, " ").trim();

  return normalizedValue && normalizedValue !== "N/A" ? normalizedValue : null;
}

function isUploadedPaymentEntry(entry: CreatePaymentRecordInput) {
  return entry.source === "uploaded" || Boolean(entry.uploadedDocumentId);
}

function uuidSql(value: string | null | undefined) {
  return value ? Prisma.sql`${value}::uuid` : Prisma.sql`NULL::uuid`;
}

function hasUploadedPaymentSource(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().includes("muat naik");
}

function withUploadedPaymentSource(description: string | null) {
  if (!description) {
    return UPLOADED_PAYMENT_DESCRIPTION;
  }

  if (hasUploadedPaymentSource(description)) {
    return description;
  }

  return `${description} (${UPLOADED_PAYMENT_DESCRIPTION})`;
}
