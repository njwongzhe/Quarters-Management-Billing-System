import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { getMonthStartInAppTimeZone } from "@/lib/date-time";
import { generateTransactionNos } from "@/lib/transactions/transactions";

const UPLOADED_PAYMENT_DESCRIPTION = "Bayaran daripada muat naik.";
const MANUAL_PAYMENT_DESCRIPTION = "bayaran";

type PaymentRecordClient = Prisma.TransactionClient;
type SchemaClient = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;

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

type BalanceTableColumns = {
  monthlyCharge: Set<string>;
  arrearsSummary: Set<string>;
};

export async function createPaymentRecords(
  tx: PaymentRecordClient,
  entries: CreatePaymentRecordInput[],
) {
  if (entries.length === 0) {
    return [];
  }

  const [transactionNos, paymentColumns, transactionColumns, balanceColumns] =
    await Promise.all([
      generateTransactionNos(tx, entries.length),
      getTableColumns(tx, "Payment"),
      getTableColumns(tx, "Transaction"),
      getBalanceTableColumns(tx),
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

  for (const row of paymentRows) {
    await insertPaymentRow(tx, row, paymentColumns);
  }

  for (const [index, entry] of entries.entries()) {
    const baseDescription = normalizeOptionalPaymentText(entry.description);
    const description = isUploadedPaymentEntry(entry)
      ? withUploadedPaymentSource(baseDescription)
      : baseDescription ?? MANUAL_PAYMENT_DESCRIPTION;

    await insertTransactionRow(
      tx,
      {
        id: randomUUID(),
        transactionNo: transactionNos[index],
        residentId: entry.residentId,
        paymentId: paymentRows[index].id,
        transactionDate: entry.paymentDate,
        creditAmount: normalizePaymentAmount(entry.amount),
        receiptNo: normalizeReceiptNo(entry.receiptNo),
        description,
        createdById: entry.createdById ?? null,
      },
      transactionColumns,
    );
  }

  for (const entry of entries) {
    await applyPaymentToResidentBalance(tx, entry, balanceColumns);
  }

  return paymentRows.map((row) => row.id);
}

async function insertPaymentRow(
  tx: PaymentRecordClient,
  row: PreparedPaymentRow,
  columns: Set<string>,
) {
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
    fields.push(Prisma.sql`"uploadedDocumentId"`);
    values.push(uuidSql(row.uploadedDocumentId));
  }

  if (columns.has("createdById")) {
    fields.push(Prisma.sql`"createdById"`);
    values.push(uuidSql(row.createdById));
  }

  if (columns.has("verifiedById")) {
    fields.push(Prisma.sql`"verifiedById"`);
    values.push(uuidSql(row.verifiedById));
  }

  if (columns.has("verifiedAt")) {
    fields.push(Prisma.sql`"verifiedAt"`);
    values.push(Prisma.sql`${row.verifiedAt}`);
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Payment" (${Prisma.join(fields)})
    VALUES (${Prisma.join(values)})
  `);
}

async function insertTransactionRow(
  tx: PaymentRecordClient,
  row: {
    id: string;
    transactionNo: string;
    residentId: string;
    paymentId: string;
    transactionDate: Date;
    creditAmount: number;
    receiptNo: string | null;
    description: string;
    createdById: string | null;
  },
  columns: Set<string>,
) {
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
    fields.push(Prisma.sql`"createdById"`);
    values.push(uuidSql(row.createdById));
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "Transaction" (${Prisma.join(fields)})
    VALUES (${Prisma.join(values)})
  `);
}

async function applyPaymentToResidentBalance(
  tx: PaymentRecordClient,
  entry: CreatePaymentRecordInput,
  columns: BalanceTableColumns,
) {
  const amount = normalizePaymentAmount(entry.amount);
  const chargeMonth = getMonthStartInAppTimeZone(entry.paymentDate);
  const activeOccupancy = await tx.unitOccupancy.findFirst({
    where: {
      residentId: entry.residentId,
      status: "CURRENT",
    },
    orderBy: { moveInDate: "desc" },
    select: { unitId: true },
  });

  await upsertMonthlyChargePayment(tx, {
    residentId: entry.residentId,
    unitId: activeOccupancy?.unitId ?? null,
    chargeMonth,
    amount,
    createdById: entry.createdById ?? null,
    verifiedById: entry.verifiedById ?? null,
  }, columns.monthlyCharge);

  await upsertArrearsSummaryPayment(tx, {
    residentId: entry.residentId,
    chargeMonth,
    amount,
    createdById: entry.createdById ?? null,
    verifiedById: entry.verifiedById ?? null,
  }, columns.arrearsSummary);
}

async function upsertMonthlyChargePayment(
  tx: PaymentRecordClient,
  input: {
    residentId: string;
    unitId: string | null;
    chargeMonth: Date;
    amount: number;
    createdById: string | null;
    verifiedById: string | null;
  },
  columns: Set<string>,
) {
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
  const values = [
    uuidSql(randomUUID()),
    uuidSql(input.residentId),
    uuidSql(input.unitId),
    Prisma.sql`${input.chargeMonth}`,
    Prisma.sql`${input.amount}`,
    Prisma.sql`${-input.amount}`,
    Prisma.sql`now()`,
    Prisma.sql`now()`,
  ];
  const updates = [
    Prisma.sql`"paymentReceived" = "MonthlyCharge"."paymentReceived" + EXCLUDED."paymentReceived"`,
    Prisma.sql`"balanceForMonth" = "MonthlyCharge"."balanceForMonth" - EXCLUDED."paymentReceived"`,
    Prisma.sql`"updatedAt" = now()`,
  ];

  if (columns.has("createdById")) {
    fields.push(Prisma.sql`"createdById"`);
    values.push(uuidSql(input.createdById));
  }

  if (columns.has("verifiedById")) {
    fields.push(Prisma.sql`"verifiedById"`);
    values.push(uuidSql(input.verifiedById));

    if (input.verifiedById) {
      updates.push(Prisma.sql`"verifiedById" = EXCLUDED."verifiedById"`);
    }
  }

  if (columns.has("verifiedAt")) {
    fields.push(Prisma.sql`"verifiedAt"`);
    values.push(Prisma.sql`${input.verifiedById ? new Date() : null}`);

    if (input.verifiedById) {
      updates.push(Prisma.sql`"verifiedAt" = EXCLUDED."verifiedAt"`);
    }
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "MonthlyCharge" (${Prisma.join(fields)})
    VALUES (${Prisma.join(values)})
    ON CONFLICT ("residentId", "chargeMonth") DO UPDATE SET
      ${Prisma.join(updates)}
  `);
}

async function upsertArrearsSummaryPayment(
  tx: PaymentRecordClient,
  input: {
    residentId: string;
    chargeMonth: Date;
    amount: number;
    createdById: string | null;
    verifiedById: string | null;
  },
  columns: Set<string>,
) {
  const fields = [
    Prisma.sql`"id"`,
    Prisma.sql`"residentId"`,
    Prisma.sql`"totalArrearsAmount"`,
    Prisma.sql`"lastUpdatedMonth"`,
    Prisma.sql`"createdAt"`,
    Prisma.sql`"updatedAt"`,
  ];
  const values = [
    uuidSql(randomUUID()),
    uuidSql(input.residentId),
    Prisma.sql`${-input.amount}`,
    Prisma.sql`${input.chargeMonth}`,
    Prisma.sql`now()`,
    Prisma.sql`now()`,
  ];
  const updates = [
    Prisma.sql`"totalArrearsAmount" = "ArrearsSummary"."totalArrearsAmount" + EXCLUDED."totalArrearsAmount"`,
    Prisma.sql`"lastUpdatedMonth" = EXCLUDED."lastUpdatedMonth"`,
    Prisma.sql`"updatedAt" = now()`,
  ];

  if (columns.has("createdById")) {
    fields.push(Prisma.sql`"createdById"`);
    values.push(uuidSql(input.createdById));
  }

  if (columns.has("verifiedById")) {
    fields.push(Prisma.sql`"verifiedById"`);
    values.push(uuidSql(input.verifiedById));

    if (input.verifiedById) {
      updates.push(Prisma.sql`"verifiedById" = EXCLUDED."verifiedById"`);
    }
  }

  if (columns.has("verifiedAt")) {
    fields.push(Prisma.sql`"verifiedAt"`);
    values.push(Prisma.sql`${input.verifiedById ? new Date() : null}`);

    if (input.verifiedById) {
      updates.push(Prisma.sql`"verifiedAt" = EXCLUDED."verifiedAt"`);
    }
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "ArrearsSummary" (${Prisma.join(fields)})
    VALUES (${Prisma.join(values)})
    ON CONFLICT ("residentId") DO UPDATE SET
      ${Prisma.join(updates)}
  `);
}

async function getBalanceTableColumns(client: SchemaClient) {
  const [monthlyCharge, arrearsSummary] = await Promise.all([
    getTableColumns(client, "MonthlyCharge"),
    getTableColumns(client, "ArrearsSummary"),
  ]);

  return { monthlyCharge, arrearsSummary };
}

async function getTableColumns(client: SchemaClient, tableName: string) {
  const rows = await client.$queryRaw<{ column_name: string }[]>(Prisma.sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `);

  return new Set(rows.map((row) => row.column_name));
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
