import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { calculateAgeByIc } from "@/lib/calculateAge";
import { prisma } from "@/lib/prisma";
import { generateTransactionNos } from "@/lib/transactions/transactions";

export const UPLOADED_PAYMENT_DESCRIPTION = "Bayaran daripada muat naik.";
export const MANUAL_PAYMENT_DESCRIPTION = "Bayaran manual.";

type SchemaClient = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;
type PaymentRecordClient = Prisma.TransactionClient;

export type CreatePaymentRecordInput = {
  residentId: string;
  paymentDate: Date;
  receiptNo: string | null;
  amount: Prisma.Decimal | string | number;
  description?: string | null;
  uploadedDocumentId?: string | null;
  createdById?: string | null;
  verifiedById?: string | null;
  source: "manual" | "uploaded";
};

export type ManualPaymentRowInput = {
  paymentDate: string;
  receiptNo?: string | null;
  amount: string | number;
  description?: string | null;
};

export type BayaranPaymentDetail = Awaited<
  ReturnType<typeof getBayaranPaymentDetail>
>;

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

type BayaranPaymentRawRow = {
  id: string;
  residentId: string;
  paymentDate: Date | string;
  receiptNo: string | null;
  amount: Prisma.Decimal | string | number;
  description: string | null;
  transactionNo: string | null;
  transactionDescription: string | null;
  transactionReceiptNo: string | null;
  sourceFile: string | null;
  hasUploadedDocument: boolean | null;
  hasManualAudit: boolean | null;
  hasLegacyUploadAudit: boolean | null;
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
    const baseDescription = normalizeOptionalText(entry.description);

    return {
      id: randomUUID(),
      residentId: entry.residentId,
      paymentDate: entry.paymentDate,
      receiptNo: normalizeReceiptNo(entry.receiptNo),
      amount: normalizeAmount(entry.amount),
      description:
        entry.source === "uploaded"
          ? baseDescription ?? UPLOADED_PAYMENT_DESCRIPTION
          : baseDescription ?? MANUAL_PAYMENT_DESCRIPTION,
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
    const baseDescription = normalizeOptionalText(entry.description);
    const description =
      entry.source === "uploaded"
        ? withUploadedPaymentSource(baseDescription)
        : withManualPaymentSource(baseDescription);

    await insertTransactionRow(
      tx,
      {
        id: randomUUID(),
        transactionNo: transactionNos[index],
        residentId: entry.residentId,
        paymentId: paymentRows[index].id,
        transactionDate: entry.paymentDate,
        creditAmount: normalizeAmount(entry.amount),
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

export async function getBayaranPaymentDetail(paymentId: string) {
  const [anchorPayment] = await prisma.$queryRaw<
    { id: string; residentId: string }[]
  >(Prisma.sql`
    SELECT "id", "residentId"
    FROM "Payment"
    WHERE "id" = ${paymentId}::uuid
    LIMIT 1
  `);

  if (!anchorPayment) {
    return null;
  }

  const [resident, paymentColumns] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: anchorPayment.residentId },
      select: {
        id: true,
        fullName: true,
        icNumber: true,
        status: true,
        arrearsSummary: {
          select: {
            totalArrearsAmount: true,
          },
        },
        occupancies: {
          where: { status: "CURRENT" },
          orderBy: { moveInDate: "desc" },
          select: {
            moveInDate: true,
            moveOutDate: true,
            unit: {
              select: {
                unitCode: true,
                quarterCategory: {
                  select: {
                    categoryName: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    getTableColumns(prisma, "Payment"),
  ]);

  if (!resident) {
    return null;
  }

  const residentPayments = await getResidentPaymentRows(
    anchorPayment.residentId,
    paymentColumns,
  );
  const selectedPayment = residentPayments.find(
    (payment) => payment.id === anchorPayment.id,
  );

  if (!selectedPayment) {
    return null;
  }

  const activeOccupancy = resident.occupancies[0];
  const currentArrears = Number(resident.arrearsSummary?.totalArrearsAmount ?? 0);
  const selectedPaymentRow = mapPaymentHistoryItem(selectedPayment);

  return {
    profile: {
      residentId: resident.id,
      fullName: resident.fullName,
      icNumber: resident.icNumber,
      age: calculateAgeByIc(resident.icNumber),
      kelas: activeOccupancy?.unit.quarterCategory.categoryName ?? "N/A",
      unit: activeOccupancy?.unit.unitCode ?? "N/A",
      moveInDate: activeOccupancy?.moveInDate.toISOString() ?? null,
      moveOutDate: activeOccupancy?.moveOutDate?.toISOString() ?? null,
      status: formatResidentStatus(resident.status),
    },
    currentPayment: {
      ...selectedPaymentRow,
      currentArrears,
      paymentStatus: getPaymentStatus(currentArrears),
    },
    uploadedHistory: residentPayments
      .filter(isUploadedPayment)
      .map(mapPaymentHistoryItem),
    manualPayments: residentPayments
      .filter((payment) => !isUploadedPayment(payment))
      .map(mapPaymentHistoryItem),
  };
}

export async function createManualBayaranPayments(
  anchorPaymentId: string,
  rows: ManualPaymentRowInput[],
  adminId: string | null,
) {
  const [anchorPayment] = await prisma.$queryRaw<{ residentId: string }[]>(
    Prisma.sql`
      SELECT "residentId"
      FROM "Payment"
      WHERE "id" = ${anchorPaymentId}::uuid
      LIMIT 1
    `,
  );

  if (!anchorPayment) {
    throw new Error("Rekod bayaran rujukan tidak dijumpai.");
  }

  const parsedRows = parseManualPaymentRows(rows).map((row) => ({
    ...row,
    residentId: anchorPayment.residentId,
    createdById: adminId,
    verifiedById: adminId,
    uploadedDocumentId: null,
    source: "manual" as const,
  }));

  await assertNoDuplicateManualPayments(anchorPayment.residentId, parsedRows);

  return prisma.$transaction(
    (tx) => createPaymentRecords(tx, parsedRows),
    { maxWait: 10000, timeout: 30000 },
  );
}

export function parseManualPaymentRows(rows: ManualPaymentRowInput[]) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Sila tambah sekurang-kurangnya satu rekod bayaran.");
  }

  return rows.map((row, index) => {
    const rowNumber = index + 1;
    const paymentDate = parseDateInput(row.paymentDate, rowNumber);
    const amount = parseAmountInput(row.amount, rowNumber);
    const receiptNo = normalizeReceiptNo(row.receiptNo);

    if (!receiptNo) {
      throw new Error(`No. resit wajib diisi untuk rekod bayaran ${rowNumber}.`);
    }

    return {
      paymentDate,
      receiptNo,
      amount,
      description: normalizeOptionalText(row.description),
    };
  });
}

async function getResidentPaymentRows(
  residentId: string,
  paymentColumns: Set<string>,
) {
  const hasUploadedDocumentId = paymentColumns.has("uploadedDocumentId");
  const hasCreatedById = paymentColumns.has("createdById");
  const hasVerifiedById = paymentColumns.has("verifiedById");
  const sourceSelect = hasUploadedDocumentId
    ? Prisma.sql`
        COALESCE(d."originalName", d."fileName") AS "sourceFile",
        (p."uploadedDocumentId" IS NOT NULL) AS "hasUploadedDocument"
      `
    : Prisma.sql`
        NULL::text AS "sourceFile",
        false AS "hasUploadedDocument"
      `;
  const uploadedDocumentJoin = hasUploadedDocumentId
    ? Prisma.sql`LEFT JOIN "UploadedDocument" d ON d."id" = p."uploadedDocumentId"`
    : Prisma.empty;
  const auditSelect =
    hasCreatedById && hasVerifiedById
      ? Prisma.sql`
          (p."createdById" IS NOT NULL OR p."verifiedById" IS NOT NULL) AS "hasManualAudit",
          (p."createdById" IS NULL AND p."verifiedById" IS NULL) AS "hasLegacyUploadAudit"
        `
      : hasCreatedById
        ? Prisma.sql`
            (p."createdById" IS NOT NULL) AS "hasManualAudit",
            (p."createdById" IS NULL) AS "hasLegacyUploadAudit"
          `
        : hasVerifiedById
          ? Prisma.sql`
              (p."verifiedById" IS NOT NULL) AS "hasManualAudit",
              (p."verifiedById" IS NULL) AS "hasLegacyUploadAudit"
            `
          : Prisma.sql`
              false AS "hasManualAudit",
              true AS "hasLegacyUploadAudit"
            `;

  return prisma.$queryRaw<BayaranPaymentRawRow[]>(Prisma.sql`
    SELECT
      p."id",
      p."residentId",
      p."paymentDate",
      p."receiptNo",
      p."amount",
      p."description",
      t."transactionNo",
      t."description" AS "transactionDescription",
      t."receiptNo" AS "transactionReceiptNo",
      ${sourceSelect},
      ${auditSelect}
    FROM "Payment" p
    LEFT JOIN "Transaction" t ON t."paymentId" = p."id"
    ${uploadedDocumentJoin}
    WHERE p."residentId" = ${residentId}::uuid
    ORDER BY p."paymentDate" DESC, p."createdAt" DESC
  `);
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
  const amount = normalizeAmount(entry.amount);
  const chargeMonth = getMonthStart(entry.paymentDate);
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

async function assertNoDuplicateManualPayments(
  residentId: string,
  rows: ReturnType<typeof parseManualPaymentRows>,
) {
  const duplicateKeys = new Set<string>();

  for (const row of rows) {
    const key = getPaymentKey({
      residentId,
      paymentDate: row.paymentDate,
      receiptNo: row.receiptNo,
      amount: row.amount,
    });

    if (duplicateKeys.has(key)) {
      throw new Error("Terdapat rekod bayaran manual yang berulang dalam borang ini.");
    }

    duplicateKeys.add(key);
  }

  for (const row of rows) {
    const existingPayment = await prisma.payment.findFirst({
      where: {
        residentId,
        paymentDate: row.paymentDate,
        receiptNo: row.receiptNo,
        amount: row.amount,
      },
      select: { id: true },
    });

    if (existingPayment) {
      throw new Error(
        `Bayaran dengan tarikh ${formatDateInput(row.paymentDate)}, no. resit ${row.receiptNo}, dan amaun yang sama telah wujud.`,
      );
    }
  }
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

async function getBalanceTableColumns(client: SchemaClient) {
  const [monthlyCharge, arrearsSummary] = await Promise.all([
    getTableColumns(client, "MonthlyCharge"),
    getTableColumns(client, "ArrearsSummary"),
  ]);

  return { monthlyCharge, arrearsSummary };
}

function mapPaymentHistoryItem(payment: BayaranPaymentRawRow) {
  const description =
    stripPaymentSource(payment.description) ||
    stripPaymentSource(payment.transactionDescription) ||
    "Bayaran Diterima";

  return {
    id: payment.id,
    paymentNo: payment.transactionNo ?? shortId(payment.id),
    paymentDate: new Date(payment.paymentDate).toISOString(),
    receiptNo: payment.receiptNo ?? payment.transactionReceiptNo ?? "N/A",
    description,
    amount: Number(payment.amount),
    sourceFile: payment.sourceFile,
  };
}

function isUploadedPayment(payment: BayaranPaymentRawRow) {
  if (
    hasManualPaymentSource(payment.description) ||
    hasManualPaymentSource(payment.transactionDescription)
  ) {
    return false;
  }

  if (
    payment.hasUploadedDocument ||
    payment.sourceFile ||
    hasUploadedPaymentSource(payment.description) ||
    hasUploadedPaymentSource(payment.transactionDescription)
  ) {
    return true;
  }

  if (payment.hasManualAudit) {
    return false;
  }

  if (payment.hasLegacyUploadAudit) {
    return true;
  }

  return true;
}

function parseDateInput(value: string, rowNumber: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Tarikh bayaran tidak sah untuk rekod ${rowNumber}.`);
  }

  const date = new Date(`${value}T00:00:00.000+08:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Tarikh bayaran tidak sah untuk rekod ${rowNumber}.`);
  }

  return date;
}

function parseAmountInput(value: string | number, rowNumber: number) {
  const normalizedValue = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    throw new Error(
      `Amaun bayaran untuk rekod ${rowNumber} mesti nombor maksimum 2 tempat perpuluhan.`,
    );
  }

  const amount = Number(normalizedValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Amaun bayaran untuk rekod ${rowNumber} mesti melebihi 0.`);
  }

  return Number(amount.toFixed(2));
}

function hasUploadedPaymentSource(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().includes("muat naik");
}

function hasManualPaymentSource(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().includes("bayaran manual");
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

function withManualPaymentSource(description: string | null) {
  if (!description) {
    return MANUAL_PAYMENT_DESCRIPTION;
  }

  if (hasManualPaymentSource(description)) {
    return description;
  }

  return `${description} (${MANUAL_PAYMENT_DESCRIPTION})`;
}

function stripPaymentSource(value: string | null | undefined) {
  const stripped = String(value ?? "")
    .replace(/\s*\(?Bayaran daripada muat naik\.?\)?/gi, "")
    .replace(/\s*\(?Bayaran manual\.?\)?/gi, "")
    .trim();

  return stripped || "";
}

function getPaymentStatus(currentArrears: number) {
  if (currentArrears < 0) {
    return "Lebihan Bayaran";
  }

  if (currentArrears > 0) {
    return "Kurang Bayaran";
  }

  return "Cukup Bayaran";
}

function formatResidentStatus(status: string) {
  const labels: Record<string, string> = {
    AKTIF: "Aktif",
    TIDAK_LAYAK: "Tidak Layak",
    PENCEN_MENDATANG: "Pencen Mendatang",
    DATA_TIDAK_LENGKAP: "Data Tidak Lengkap",
  };

  return labels[status] ?? status.replace(/_/g, " ");
}

function getMonthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function normalizeAmount(value: Prisma.Decimal | string | number) {
  return Number(Number(value).toFixed(2));
}

function normalizeReceiptNo(value: string | null | undefined) {
  const normalizedValue = String(value ?? "").replace(/\s+/g, " ").trim();

  return normalizedValue || null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = String(value ?? "").replace(/\s+/g, " ").trim();

  return normalizedValue && normalizedValue !== "N/A" ? normalizedValue : null;
}

function uuidSql(value: string | null | undefined) {
  return value ? Prisma.sql`${value}::uuid` : Prisma.sql`NULL::uuid`;
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function getPaymentKey(input: {
  residentId: string;
  paymentDate: Date;
  receiptNo: string | null;
  amount: number;
}) {
  return [
    input.residentId,
    input.paymentDate.toISOString(),
    input.receiptNo ?? "",
    input.amount.toFixed(2),
  ].join("|");
}

function formatDateInput(value: Date) {
  return value.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
