import { Prisma, TransactionStatus, TransactionCategory } from "@prisma/client";
import {prisma} from "./prisma";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export interface TransactionFilterParams {
  search?: string; // Fits ID, Resident Name, IC, or Receipt No
  startDate?: string;
  endDate?: string;
  categories?: TransactionCategory[];
  statuses?: TransactionStatus[];
  page?: number;
  limit?: number;
}

export interface TransactionSummary {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
}

// ==========================================
// 2. READ OPERATIONS (GET DATA)
// ==========================================

/**
 * Get the top dashboard KPIs (Total Count, Debit, Credit)
 */
export async function getTransactionsSummary(): Promise<TransactionSummary> {
  const aggregate = await prisma.transaction.aggregate({
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    totalCount: aggregate._count.id || 0,
    totalDebit: Number(aggregate._sum.debitAmount || 0),
    totalCredit: Number(aggregate._sum.creditAmount || 0),
  };
}

/**
 * Get the paginated and filtered list of transactions for the main table
 */
export async function getTransactionsList(params: TransactionFilterParams) {
  const { search, startDate, endDate, categories, statuses, page = 1, limit = 10 } = params;
  const skip = (page - 1) * limit;

  // Build the dynamic WHERE clause cleanly
  const andConditions: Prisma.TransactionWhereInput[] = [];

  if (startDate) andConditions.push({ transactionDate: { gte: new Date(startDate) } });
  if (endDate) andConditions.push({ transactionDate: { lte: new Date(endDate) } });
  if (categories && categories.length > 0) andConditions.push({ category: { in: categories } });
  if (statuses && statuses.length > 0) andConditions.push({ status: { in: statuses } });

  if (search) {
    andConditions.push({
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { receiptNo: { contains: search, mode: "insensitive" } }, // Added receipt search
        { resident: { fullName: { contains: search, mode: "insensitive" } } }, // Fixed to fullName
        { resident: { icNumber: { contains: search, mode: "insensitive" } } }, // Fixed to icNumber
      ],
    });
  }

  const whereClause: Prisma.TransactionWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  // Fetch the data with relations
  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where: whereClause,
      include: {
        resident: {
          select: {
            fullName: true, // Fixed to fullName
            icNumber: true, // Fixed to icNumber
            occupancies: {  // Fixed from unitOccupancies to occupancies (based on your schema)
              where: { status: "CURRENT" },
              include: { unit: { include: { quarterCategory: true } } }
            }
          }
        },
        relatedTransaction: true, // Parent related transaction
        childTransactions: true,  // Child related transactions (Reversals/Adjustments)
      },
      orderBy: { transactionDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: whereClause }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

// ==========================================
// 3. WRITE OPERATIONS (LEDGER ACTIONS)
// ==========================================

/**
 * REVERSAL (Pembalikan): Cancels out a transaction by creating an opposite record.
 */
export async function reverseTransaction(
  originalTxId: string, 
  adminId: string, 
  remarks: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Find the original
    const original = await tx.transaction.findUnique({ where: { id: originalTxId } });
    if (!original) throw new Error("Transaksi asal tidak dijumpai.");
    if (original.status !== "NORMAL") throw new Error("Hanya transaksi NORMAL boleh dibatalkan.");

    // 2. Update original status to DIBATALKAN
    await tx.transaction.update({
      where: { id: originalTxId },
      data: { status: "DIBATALKAN" },
    });

    // 3. Create the Balancing Reversal Record
    const pembalikan = await tx.transaction.create({
      data: {
        residentId: original.residentId,
        transactionDate: new Date(), 
        category: original.category,
        status: "PEMBALIKAN",
        debitAmount: original.creditAmount, // Swap amounts
        creditAmount: original.debitAmount,
        description: remarks,
        relatedTransactionId: original.id, 
        createdById: adminId,
      },
    });

    return pembalikan;
  });
}

/**
 * ADJUSTMENT (Pelarasan): Adds a delta record to fix an incorrect amount.
 */
export async function adjustTransaction(
  originalTxId: string,
  adminId: string,
  newAmount: number,
  remarks: string
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findUnique({ where: { id: originalTxId } });
    if (!original) throw new Error("Transaksi asal tidak dijumpai.");
    if (original.status !== "NORMAL") throw new Error("Hanya transaksi NORMAL boleh dilaraskan.");

    const isCredit = Number(original.creditAmount) > 0;
    const oldAmount = isCredit ? Number(original.creditAmount) : Number(original.debitAmount);
    
    const deltaAmount = newAmount - oldAmount;
    if (deltaAmount === 0) throw new Error("Tiada perubahan pada amaun.");

    // Update original status to DILARASKAN
    await tx.transaction.update({
      where: { id: originalTxId },
      data: { status: "DILARASKAN" },
    });

    // Create the Adjustment Record
    const pelarasan = await tx.transaction.create({
      data: {
        residentId: original.residentId,
        transactionDate: new Date(),
        category: original.category,
        status: "PELARASAN",
        debitAmount: isCredit ? 0 : deltaAmount,
        creditAmount: isCredit ? deltaAmount : 0,
        description: remarks,
        relatedTransactionId: original.id, 
        createdById: adminId,
      },
    });

    return pelarasan;
  });
}