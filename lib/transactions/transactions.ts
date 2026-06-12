import { Prisma, TransactionStatus, TransactionCategory } from "@prisma/client";
import { prisma } from "../prisma";
import {
  formatDatePrefixInAppTimeZone,
  getDateOnlyRangeInAppTimeZone,
  getMonthStartInAppTimeZone,
} from "@/lib/date-time";
import {
  formatAuditTarget,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";

type TransactionNoClient = Pick<Prisma.TransactionClient, "$executeRaw" | "transaction">;
type TransactionAuditActor = {
  profile: {
    id: string;
    fullName: string;
  };
} | null;

export interface TransactionFilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  categories?: TransactionCategory[];
  statuses?: TransactionStatus[];
  type?: "DEBIT" | "CREDIT";
  page?: number;
  limit?: number;
}

export interface TransactionSummary {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
}

// Helper function to build dynamic where clause based on provided filters with type safety and validation.
function buildTransactionWhereClause(params: TransactionFilterParams): Prisma.TransactionWhereInput {
  const { search, startDate, endDate, categories, statuses, type } = params;
  const andConditions: Prisma.TransactionWhereInput[] = [];

  if (isDateInput(startDate)) {
    const range = getDateOnlyRangeInAppTimeZone(startDate);
    if (range) andConditions.push({ transactionDate: { gte: range.start } });
  }
  if (isDateInput(endDate)) {
    const range = getDateOnlyRangeInAppTimeZone(endDate);
    if (range) andConditions.push({ transactionDate: { lte: range.end } });
  }
  if (categories && categories.length > 0) andConditions.push({ category: { in: categories } });
  if (statuses && statuses.length > 0) andConditions.push({ status: { in: statuses } });

  if (type === "DEBIT") {
    andConditions.push({ debitAmount: { gt: 0 } });
  } else if (type === "CREDIT") {
    andConditions.push({ creditAmount: { gt: 0 } });
  }

  if (search) {
    const cleanSearch = search.trim();
    andConditions.push({
      OR: [
        { transactionNo: { contains: cleanSearch, mode: "insensitive" } },
        { description: { contains: cleanSearch, mode: "insensitive" } },
        { receiptNo: { contains: cleanSearch, mode: "insensitive" } },
        { resident: { fullName: { contains: cleanSearch, mode: "insensitive" } } },
        { resident: { icNumber: { contains: cleanSearch, mode: "insensitive" } } },
      ],
    });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

// Data projection mappings queries limits definitions
const transactionChildSelect = {
  id: true,
  transactionNo: true,
  relatedTransactionId: true,
  transactionDate: true,
  createdAt: true,
  status: true,
  description: true,
  debitAmount: true,
  creditAmount: true,
} satisfies Prisma.TransactionSelect;

const transactionListSelect = {
  id: true,
  transactionNo: true,
  residentId: true,
  relatedTransactionId: true,
  transactionDate: true,
  createdAt: true,
  category: true,
  status: true,
  debitAmount: true,
  creditAmount: true,
  receiptNo: true,
  description: true,
  resident: { select: { fullName: true, icNumber: true } },
  relatedTransaction: {
    select: {
      id: true,
      transactionNo: true,
      relatedTransactionId: true,
      transactionDate: true,
      createdAt: true,
      status: true,
      description: true,
      debitAmount: true,
      creditAmount: true,
      childTransactions: { select: transactionChildSelect },
    },
  },
  childTransactions: { select: transactionChildSelect },
} satisfies Prisma.TransactionSelect;

// -------------------------------------------------------------------------
// DATABASE READ READ-OPERATIONS
// -------------------------------------------------------------------------
export async function getTransactionsSummary(params: TransactionFilterParams = {}): Promise<TransactionSummary> {
  const whereClause = buildTransactionWhereClause(params);

  const aggregate = await prisma.transaction.aggregate({
    where: whereClause,
    _sum: { debitAmount: true, creditAmount: true },
    _count: { id: true },
  });

  return {
    totalCount: aggregate._count.id || 0,
    totalDebit: Number(aggregate._sum.debitAmount || 0),
    totalCredit: Number(aggregate._sum.creditAmount || 0),
  };
}

export async function getTransactionsList(params: TransactionFilterParams) {
  const { page = 1, limit = 10 } = params;
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const offset = (safePage - 1) * safeLimit;
  const sqlConditions = buildTransactionSqlConditions(params);
  const whereSql =
    sqlConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(sqlConditions, " AND ")}`
      : Prisma.empty;

  const pageRows = await prisma.$queryRaw<
    { id: string; totalCount: bigint }[]
  >(Prisma.sql`
    WITH filtered_transactions AS (
      SELECT
        t."id",
        t."relatedTransactionId",
        t."status",
        t."createdAt",
        t."transactionNo",
        ROW_NUMBER() OVER (
          PARTITION BY
            CASE
              WHEN t."status" IN (
                'PELARASAN'::"TransactionStatus",
                'PEMBALIKAN'::"TransactionStatus"
              )
              AND t."relatedTransactionId" IS NOT NULL
                THEN CONCAT('child:', t."relatedTransactionId"::text)
              ELSE CONCAT('row:', t."id"::text)
            END
          ORDER BY
            t."createdAt" DESC,
            COALESCE(t."transactionNo", t."id"::text) DESC,
            t."id" DESC
        ) AS "relatedRank"
      FROM "Transaction" t
      LEFT JOIN "Resident" r
        ON r."id" = t."residentId"
      ${whereSql}
    ),
    visible_transactions AS (
      SELECT
        "id",
        "createdAt",
        "transactionNo"
      FROM filtered_transactions
      WHERE
        NOT (
          "status" IN (
            'PELARASAN'::"TransactionStatus",
            'PEMBALIKAN'::"TransactionStatus"
          )
          AND "relatedTransactionId" IS NOT NULL
        )
        OR "relatedRank" = 1
    )
    SELECT
      "id",
      COUNT(*) OVER ()::bigint AS "totalCount"
    FROM visible_transactions
    ORDER BY
      "createdAt" DESC,
      COALESCE("transactionNo", "id"::text) DESC,
      "id" DESC
    OFFSET ${offset}
    LIMIT ${safeLimit}
  `);

  const orderedIds = pageRows.map((row) => row.id);
  const total = Number(pageRows[0]?.totalCount ?? 0);

  if (orderedIds.length === 0) {
    return {
      data: [],
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      id: {
        in: orderedIds,
      },
    },
    select: transactionListSelect,
  });
  const transactionById = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );
  const data = orderedIds.flatMap((id) => {
    const transaction = transactionById.get(id);
    return transaction ? [transaction] : [];
  });

  return {
    data,
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeLimit),
  };
}

function isDateInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function buildTransactionSqlConditions(params: TransactionFilterParams) {
  const conditions: Prisma.Sql[] = [];

  if (isDateInput(params.startDate)) {
    const range = getDateOnlyRangeInAppTimeZone(params.startDate);
    if (range) {
      conditions.push(Prisma.sql`t."transactionDate" >= ${range.start}`);
    }
  }

  if (isDateInput(params.endDate)) {
    const range = getDateOnlyRangeInAppTimeZone(params.endDate);
    if (range) {
      conditions.push(Prisma.sql`t."transactionDate" <= ${range.end}`);
    }
  }

  if (params.categories?.length) {
    conditions.push(
      Prisma.sql`t."category" IN (${Prisma.join(
        params.categories.map(
          (category) => Prisma.sql`${category}::"TransactionCategory"`,
        ),
      )})`,
    );
  }

  if (params.statuses?.length) {
    conditions.push(
      Prisma.sql`t."status" IN (${Prisma.join(
        params.statuses.map(
          (status) => Prisma.sql`${status}::"TransactionStatus"`,
        ),
      )})`,
    );
  }

  if (params.type === "DEBIT") {
    conditions.push(Prisma.sql`t."debitAmount" > 0`);
  } else if (params.type === "CREDIT") {
    conditions.push(Prisma.sql`t."creditAmount" > 0`);
  }

  const search = params.search?.trim();
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(Prisma.sql`(
      t."transactionNo" ILIKE ${searchPattern}
      OR t."description" ILIKE ${searchPattern}
      OR t."receiptNo" ILIKE ${searchPattern}
      OR r."fullName" ILIKE ${searchPattern}
      OR r."icNumber" ILIKE ${searchPattern}
    )`);
  }

  return conditions;
}

// -------------------------------------------------------------------------
// DATABASE MUTATION DATA-WRITE LEDGER CONFIGURATIONS
// -------------------------------------------------------------------------
export async function reverseTransaction(
  originalTxId: string,
  actor: TransactionAuditActor,
  remarks: string,
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findUnique({ 
      where: { id: originalTxId },
      include: {
        childTransactions: true,
        resident: {
          select: {
            fullName: true,
            icNumber: true,
          },
        },
      },
    });
    if (!original) throw new Error("Transaksi asal tidak dijumpai.");
    if (original.status !== "NORMAL" && original.status !== "DILARASKAN") {
      throw new Error("Hanya transaksi NORMAL atau DILARASKAN boleh dibalikan.");
    }

    await tx.transaction.update({
      where: { id: originalTxId },
      data: { status: "DIBALIKAN" }, 
    });

    const isDebitOriginal = Number(original.debitAmount) > 0;
    const originalAmount = isDebitOriginal ? Number(original.debitAmount) : Number(original.creditAmount);

    const pastPelarasans = original.childTransactions.filter((c) => c.status === "PELARASAN");
    const totalPastDebit = pastPelarasans.reduce((sum, c) => sum + Number(c.debitAmount), 0);
    const totalPastCredit = pastPelarasans.reduce((sum, c) => sum + Number(c.creditAmount), 0);
    
    let currentNet = originalAmount;
    if (isDebitOriginal) {
      currentNet = currentNet + totalPastDebit - totalPastCredit;
    } else {
      currentNet = currentNet + totalPastCredit - totalPastDebit;
    }

    if (original.residentId) {
        const targetChargeMonth = original.chargeMonth || original.transactionDate;
        await applyFinancialDeltaToBilling(tx, original.residentId, targetChargeMonth, original.category, -currentNet, remarks);
    }

    const newTransactionNo = await generateTransactionNo(tx);
    let reverseDebit = 0;
    let reverseCredit = 0;
    
    if (isDebitOriginal) {
      reverseCredit = currentNet;
    } else {
      reverseDebit = currentNet;
    }

    const reversal = await tx.transaction.create({
      data: {
        transactionNo: newTransactionNo, 
        residentId: original.residentId,
        transactionDate: new Date(), 
        category: "LAIN_LAIN", 
        status: "PEMBALIKAN",
        debitAmount: reverseDebit, 
        creditAmount: reverseCredit,
        description: remarks,
        relatedTransactionId: original.id, 
        chargeMonth: original.chargeMonth,
      },
    });

    await recordDataAuditLog(tx, {
      actor,
      moduleName: "Transaksi",
      actionType: "REVERSAL",
      target: formatAuditTarget([
        original.transactionNo ?? originalTxId,
        original.resident?.fullName,
        original.resident?.icNumber
          ? `No. KP ${original.resident.icNumber}`
          : null,
      ]),
      entityType: "TRANSACTION",
      entityId: originalTxId,
      summary: "Membalikkan transaksi dan menjana rekod imbangan.",
      details: [
        `Transaksi asal: ${original.transactionNo ?? originalTxId}.`,
        `Transaksi pembalikan: ${reversal.transactionNo ?? reversal.id}.`,
        `Catatan: ${remarks}.`,
      ],
    });

    return reversal;
  });
}

export async function adjustTransaction(
  originalTxId: string,
  actor: TransactionAuditActor,
  newAmount: number,
  remarks: string,
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findUnique({ 
      where: { id: originalTxId },
      include: {
        childTransactions: true,
        resident: {
          select: {
            fullName: true,
            icNumber: true,
          },
        },
      },
    });
    
    if (!original) throw new Error("Transaksi asal tidak dijumpai.");
    if (original.status !== "NORMAL" && original.status !== "DILARASKAN") {
      throw new Error("Hanya transaksi NORMAL dan DILARASKAN boleh dilaraskan.");
    }

    const isDebitOriginal = Number(original.debitAmount) > 0;
    const originalAmount = isDebitOriginal ? Number(original.debitAmount) : Number(original.creditAmount);
    
    const pastPelarasans = original.childTransactions.filter((c) => c.status === "PELARASAN");
    const totalPastDebit = pastPelarasans.reduce((sum, c) => sum + Number(c.debitAmount), 0);
    const totalPastCredit = pastPelarasans.reduce((sum, c) => sum + Number(c.creditAmount), 0);
    
    let currentNet = originalAmount;
    if (isDebitOriginal) {
      currentNet = currentNet + totalPastDebit - totalPastCredit;
    } else {
      currentNet = currentNet + totalPastCredit - totalPastDebit;
    }

    const deltaAmount = newAmount - currentNet;
    if (deltaAmount === 0) throw new Error("Tiada perubahan jumlah dikesan.");

    if (original.residentId) {
        const targetChargeMonth = original.chargeMonth || original.transactionDate;
        await applyFinancialDeltaToBilling(tx, original.residentId, targetChargeMonth, original.category, deltaAmount, remarks);
    }

    let newDebit = 0;
    let newCredit = 0;
    
    if (isDebitOriginal) {
      if (deltaAmount > 0) newDebit = deltaAmount;
      if (deltaAmount < 0) newCredit = Math.abs(deltaAmount);
    } else {
      if (deltaAmount > 0) newCredit = deltaAmount;
      if (deltaAmount < 0) newDebit = Math.abs(deltaAmount);
    }

    await tx.transaction.update({
      where: { id: originalTxId },
      data: { status: "DILARASKAN" },
    });

    const newTransactionNo = await generateTransactionNo(tx); 

    const adjustment = await tx.transaction.create({
      data: {
        transactionNo: newTransactionNo, 
        residentId: original.residentId,
        transactionDate: new Date(),
        category: "LAIN_LAIN", 
        status: "PELARASAN",
        debitAmount: newDebit,
        creditAmount: newCredit,
        description: remarks,
        relatedTransactionId: original.id, 
        chargeMonth: original.chargeMonth,
      },
    });

    await recordDataAuditLog(tx, {
      actor,
      moduleName: "Transaksi",
      actionType: "ADJUSTMENT",
      target: formatAuditTarget([
        original.transactionNo ?? originalTxId,
        original.resident?.fullName,
        original.resident?.icNumber
          ? `No. KP ${original.resident.icNumber}`
          : null,
      ]),
      entityType: "TRANSACTION",
      entityId: originalTxId,
      summary: "Melaraskan amaun transaksi.",
      details: [
        `Transaksi asal: ${original.transactionNo ?? originalTxId}.`,
        `Transaksi pelarasan: ${adjustment.transactionNo ?? adjustment.id}.`,
        `Amaun baharu: RM ${Number(newAmount).toFixed(2)}.`,
        `Catatan: ${remarks}.`,
      ],
    });

    return adjustment;
  });
}

// -------------------------------------------------------------------------
// ID GENERATOR UTILITIES SEQUENCES ENGINE
// -------------------------------------------------------------------------
export async function generateTransactionNo(txClient: TransactionNoClient = prisma): Promise<string> {
  return (await generateTransactionNos(txClient, 1))[0];
}

export async function generateTransactionNos(txClient: TransactionNoClient = prisma, count = 1): Promise<string[]> {
  const totalCount = Math.max(0, Math.floor(count));
  if (totalCount === 0) return [];

  // Enforce isolation via low level relational mutual exclusivity transaction block keys constraints locks
  await txClient.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(724019337)`);

  const datePrefix = formatDatePrefixInAppTimeZone();
  const lastTransaction = await txClient.transaction.findFirst({
    where: { transactionNo: { startsWith: datePrefix } },
    orderBy: { transactionNo: 'desc' },
    select: { transactionNo: true }
  });

  let nextSequence = 1;
  if (lastTransaction && lastTransaction.transactionNo) {
    const lastSequenceStr = lastTransaction.transactionNo.split('-')[1];
    if (lastSequenceStr) nextSequence = parseInt(lastSequenceStr, 10) + 1;
  }

  return Array.from({ length: totalCount }, (_v, index) => {
    const sequenceStr = String(nextSequence + index).padStart(8, '0');
    return `${datePrefix}-${sequenceStr}`;
  });
}

// Sync billing subsystem automation balance mirroring pipeline handler
async function applyFinancialDeltaToBilling(
  tx: Prisma.TransactionClient,
  residentId: string,
  targetChargeMonth: Date,
  category: TransactionCategory,
  deltaAmount: number,
  remarks: string
) {
  if (!residentId || deltaAmount === 0) return;

  // 1. Force the date to the first day of the app timezone month to find the correct MonthlyCharge.
  const chargeMonth = getMonthStartInAppTimeZone(targetChargeMonth);

  let monthlyCharge = await tx.monthlyCharge.findUnique({
    where: { residentId_chargeMonth: { residentId, chargeMonth } }
  });

  if (!monthlyCharge) {
    monthlyCharge = await tx.monthlyCharge.create({ data: { residentId, chargeMonth } });
  }

  let arrearsDelta = 0;

  switch (category) {
    case "CAJ_SEWA":
      await tx.monthlyCharge.update({
        where: { id: monthlyCharge.id },
        data: { rentalAmount: { increment: deltaAmount }, totalMonthlyCharge: { increment: deltaAmount }, balanceForMonth: { increment: deltaAmount } }
      });
      arrearsDelta = deltaAmount;
      break;
    case "CAJ_PENYELENGGARAAN":
      await tx.monthlyCharge.update({
        where: { id: monthlyCharge.id },
        data: { maintenanceAmount: { increment: deltaAmount }, totalMonthlyCharge: { increment: deltaAmount }, balanceForMonth: { increment: deltaAmount } }
      });
      arrearsDelta = deltaAmount;
      break;
    case "CAJ_PENALTI":
      await tx.monthlyCharge.update({
        where: { id: monthlyCharge.id },
        data: { penaltyAmount: { increment: deltaAmount }, totalMonthlyCharge: { increment: deltaAmount }, balanceForMonth: { increment: deltaAmount } }
      });
      arrearsDelta = deltaAmount;
      break;
    case "CAJ_TAMBAHAN":
      await tx.additionalCharge.create({
        data: { monthlyChargeId: monthlyCharge.id, chargeDate: new Date(), description: `[Pelarasan] ${remarks}`, amount: deltaAmount }
      });
      await tx.monthlyCharge.update({
        where: { id: monthlyCharge.id },
        data: { additionalChargesTotal: { increment: deltaAmount }, totalMonthlyCharge: { increment: deltaAmount }, balanceForMonth: { increment: deltaAmount } }
      });
      arrearsDelta = deltaAmount;
      break;
    case "REBAT":
      await tx.rebate.create({
        data: { monthlyChargeId: monthlyCharge.id, rebateDate: new Date(), description: `[Pelarasan] ${remarks}`, amount: deltaAmount }
      });
      await tx.monthlyCharge.update({
        where: { id: monthlyCharge.id },
        data: { rebateTotal: { increment: deltaAmount }, balanceForMonth: { increment: -deltaAmount } }
      });
      arrearsDelta = -deltaAmount;
      break;
    case "BAYARAN":
      await tx.monthlyCharge.update({
        where: { id: monthlyCharge.id },
        data: { paymentReceived: { increment: deltaAmount }, balanceForMonth: { increment: -deltaAmount } }
      });
      arrearsDelta = -deltaAmount;
      break;
    default:
      arrearsDelta = deltaAmount;
      break;
  }

  if (arrearsDelta !== 0) {
    await tx.arrearsSummary.upsert({
      where: { residentId },
      create: { residentId, totalArrearsAmount: arrearsDelta },
      update: { totalArrearsAmount: { increment: arrearsDelta } }
    });
  }
}
