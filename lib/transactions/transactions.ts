import { Prisma, TransactionStatus, TransactionCategory } from "@prisma/client";
import { prisma } from "../prisma";
import {
  formatDatePrefixInAppTimeZone,
  getDateOnlyRangeInAppTimeZone,
  getMonthStartInAppTimeZone,
} from "@/lib/date-time";

type TransactionNoClient = Pick<Prisma.TransactionClient, "$executeRaw" | "transaction">;

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

type TransactionListItem = Prisma.TransactionGetPayload<{ select: typeof transactionListSelect }>;

// -------------------------------------------------------------------------
// REVERSAL AND ADJUSTMENT VIEW INTERPOLATOR LOGIC
// -------------------------------------------------------------------------
/**
 * Processes incoming full data-arrays and returns visible entries by condensing 
 * parent logs overridden by modern adjustment (Pelarasan/Pembalikan) chains.
 */
function getVisibleTransactions(transactions: TransactionListItem[]): TransactionListItem[] {
  // Sort dataset to establish standard traversal linearity
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.transactionDate).getTime();
    const timeB = new Date(b.createdAt || b.transactionDate).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return (b.transactionNo || b.id).localeCompare(a.transactionNo || a.id);
  });

  const newestRelatedChildByParentId = new Map<string, string>();

  // Extract newest adjustments parameters constraints maps pointers configurations
  sortedTransactions.forEach((transaction) => {
    const isRelatedChild =
      ["PELARASAN", "PEMBALIKAN"].includes(transaction.status) &&
      transaction.relatedTransactionId;

    if (!isRelatedChild || !transaction.relatedTransactionId) return;

    if (!newestRelatedChildByParentId.has(transaction.relatedTransactionId)) {
      newestRelatedChildByParentId.set(transaction.relatedTransactionId, transaction.id);
    }
  });

  // Evaluate final layout arrays presentation matrices outputs filters definitions
  return sortedTransactions.filter((transaction) => {
    const isRelatedChild =
      ["PELARASAN", "PEMBALIKAN"].includes(transaction.status) &&
      transaction.relatedTransactionId;

    if (!isRelatedChild) return true;

    const relatedChildren = (
      transaction.relatedTransaction?.childTransactions ||
      transaction.childTransactions ||
      []
    )
      .filter((child) => child.status === "PELARASAN" || child.status === "PEMBALIKAN")
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.transactionDate).getTime();
        const timeB = new Date(b.createdAt || b.transactionDate).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (b.transactionNo || b.id).localeCompare(a.transactionNo || a.id);
      });

    if (relatedChildren.length > 0) {
      return relatedChildren[0].id === transaction.id;
    }

    return (
      !!transaction.relatedTransactionId &&
      newestRelatedChildByParentId.get(transaction.relatedTransactionId) === transaction.id
    );
  });
}

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
  const whereClause = buildTransactionWhereClause(params);

  // Execute complete matching records collection safely for memory aggregation and condensation
  const rawTransactions = await prisma.transaction.findMany({
    where: whereClause,
    select: transactionListSelect,
    orderBy: [{ createdAt: "desc" }, { transactionNo: "desc" }],
  });

  // Filter out overridden items, perform memory array slicing pagination offsets metrics calculations
  const visibleTransactions = getVisibleTransactions(rawTransactions);
  const total = visibleTransactions.length;
  const skip = (page - 1) * limit;
  const data = visibleTransactions.slice(skip, skip + limit);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

function isDateInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

// -------------------------------------------------------------------------
// DATABASE MUTATION DATA-WRITE LEDGER CONFIGURATIONS
// -------------------------------------------------------------------------
export async function reverseTransaction(originalTxId: string, _adminId: string, remarks: string) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findUnique({ 
      where: { id: originalTxId },
      include: { childTransactions: true } 
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
      await applyFinancialDeltaToBilling(tx, original.residentId, original.transactionDate, original.category, -currentNet, remarks);
    }

    const newTransactionNo = await generateTransactionNo(tx);
    let reverseDebit = 0;
    let reverseCredit = 0;
    
    if (isDebitOriginal) {
      reverseCredit = currentNet;
    } else {
      reverseDebit = currentNet;
    }

    return tx.transaction.create({
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
      },
    });
  });
}

export async function adjustTransaction(originalTxId: string, _adminId: string, newAmount: number, remarks: string) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findUnique({ 
      where: { id: originalTxId },
      include: { childTransactions: true }
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
      await applyFinancialDeltaToBilling(tx, original.residentId, original.transactionDate, original.category, deltaAmount, remarks);
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

    return tx.transaction.create({
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
      },
    });
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
  transactionDate: Date,
  category: TransactionCategory,
  deltaAmount: number,
  remarks: string
) {
  if (!residentId || deltaAmount === 0) return;

  const chargeMonth = getMonthStartInAppTimeZone(transactionDate);
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