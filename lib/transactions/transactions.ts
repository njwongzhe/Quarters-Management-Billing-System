import { Prisma, TransactionStatus, TransactionCategory } from "@prisma/client";
import { prisma } from "../prisma";

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

  const whereClause: Prisma.TransactionWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  // Fetch the data with relations
  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where: whereClause,
      include: {
        resident: {
          select: {
            fullName: true, 
            icNumber: true, 
            occupancies: {  
              where: { status: "CURRENT" },
              include: { unit: { include: { quarterCategory: true } } }
            }
          }
        },
        relatedTransaction: {
          include: {
            childTransactions: true,
          },
        }, // Parent related transaction
        childTransactions: true,  // Child related transactions (Reversals/Adjustments)
      },
      orderBy: [
        { createdAt: "desc" },    // Susun mengikut waktu sebenar rekod dicipta (Paling baru di atas)
        { transactionNo: "desc" } // Fallback ID sekiranya masa ciptaan tepat sama
      ],
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
  _adminId: string, 
  remarks: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Find the original
    const original = await tx.transaction.findUnique({ 
        where: { id: originalTxId },
        include: { childTransactions: true } 
    });
    if (!original) throw new Error("Transaksi asal tidak dijumpai.");
    
    // Allow both NORMAL and DILARASKAN to be reversed based on your business rules
    if (original.status !== "NORMAL" && original.status !== "DILARASKAN") {
        throw new Error("Hanya transaksi NORMAL atau DILARASKAN boleh dibalikan.");
    }

    // 2. Update original status to DIBALIKAN
    await tx.transaction.update({
      where: { id: originalTxId },
      data: { status: "DIBALIKAN" }, 
    });

    // --- NEW LOGIC: SYNC WITH BILLING ENGINE (MONTHLY CHARGE) ---
    const isDebitOriginal = Number(original.debitAmount) > 0;
    const originalAmount = isDebitOriginal ? Number(original.debitAmount) : Number(original.creditAmount);

    // Calculate the current net amount taking into account any past adjustments
    const pastPelarasans = original.childTransactions.filter((c: any) => c.status === "PELARASAN");
    const totalPastDebit = pastPelarasans.reduce((sum: number, c: any) => sum + Number(c.debitAmount), 0);
    const totalPastCredit = pastPelarasans.reduce((sum: number, c: any) => sum + Number(c.creditAmount), 0);
    
    let currentNet = originalAmount;
    if (isDebitOriginal) {
        currentNet = currentNet + totalPastDebit - totalPastCredit;
    } else {
        currentNet = currentNet + totalPastCredit - totalPastDebit;
    }

    if (original.residentId) {
        await applyFinancialDeltaToBilling(tx, original.residentId, original.transactionDate, original.category, -currentNet, remarks);
    }
    // -------------------------------------------------------------

    // 3. Create the Balancing Reversal Record
    const newTransactionNo = await generateTransactionNo(tx); // Generate ID

    let reverseDebit = 0;
    let reverseCredit = 0;
    
    if (isDebitOriginal) {
        reverseCredit = currentNet;
    } else {
        reverseDebit = currentNet;
    }

    const pembalikan = await tx.transaction.create({
      data: {
        transactionNo: newTransactionNo, 
        residentId: original.residentId,
        transactionDate: new Date(), 
        category: "LAIN_LAIN", // Strictly set to LAIN_LAIN
        status: "PEMBALIKAN",
        debitAmount: reverseDebit, 
        creditAmount: reverseCredit,
        description: remarks,
        relatedTransactionId: original.id, 
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
  _adminId: string,
  newAmount: number,
  remarks: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Dapatkan rekod asal berserta sejarah pelarasan sebelumnya (include childTransactions!)
    const original = await tx.transaction.findUnique({ 
        where: { id: originalTxId },
        include: { childTransactions: true }
    });
    
    if (!original) throw new Error("Transaksi asal tidak dijumpai.");
    if (original.status !== "NORMAL" && original.status !== "DILARASKAN") {
        throw new Error("Hanya transaksi NORMAL dan DILARASKAN boleh dilaraskan.");
    }

    // 2. Kira baki semasa sama seperti logik Frontend (Pratonton)
    const isDebitOriginal = Number(original.debitAmount) > 0;
    const originalAmount = isDebitOriginal ? Number(original.debitAmount) : Number(original.creditAmount);
    
    const pastPelarasans = original.childTransactions.filter((c: any) => c.status === "PELARASAN");
    const totalPastDebit = pastPelarasans.reduce((sum: number, c: any) => sum + Number(c.debitAmount), 0);
    const totalPastCredit = pastPelarasans.reduce((sum: number, c: any) => sum + Number(c.creditAmount), 0);
    
    let currentNet = originalAmount;
    if (isDebitOriginal) {
        currentNet = currentNet + totalPastDebit - totalPastCredit;
    } else {
        currentNet = currentNet + totalPastCredit - totalPastDebit;
    }

    // 3. Kira perbezaan (Delta) yang sebenar
    const deltaAmount = newAmount - currentNet;
    
    if (deltaAmount === 0) {
        throw new Error("Tiada perubahan jumlah dikesan.");
    }

    // --- NEW LOGIC: SYNC WITH BILLING ENGINE (MONTHLY CHARGE) ---
    if (original.residentId) {
        await applyFinancialDeltaToBilling(tx, original.residentId, original.transactionDate, original.category, deltaAmount, remarks);
    }
    // -------------------------------------------------------------

    // 4. Tentukan Debit atau Kredit untuk rekod PELARASAN baru
    let newDebit = 0;
    let newCredit = 0;
    
    if (isDebitOriginal) {
        if (deltaAmount > 0) newDebit = deltaAmount;
        if (deltaAmount < 0) newCredit = Math.abs(deltaAmount);
    } else {
        if (deltaAmount > 0) newCredit = deltaAmount;
        if (deltaAmount < 0) newDebit = Math.abs(deltaAmount);
    }

    // 5. Kemaskini status rekod asal ke DILARASKAN
    await tx.transaction.update({
      where: { id: originalTxId },
      data: { status: "DILARASKAN" },
    });

    // 6. Cipta Rekod PELARASAN dengan amaun yang dikira dengan tepat
    const newTransactionNo = await generateTransactionNo(tx); 

    const pelarasan = await tx.transaction.create({
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

    return pelarasan;
  });
}

/**
 * Generates a custom transaction ID: YYYYMMDD-0000000X
 * We pass the `txClient` so it works safely inside Prisma $transactions.
 */
export async function generateTransactionNo(txClient: any = prisma): Promise<string> {
  return (await generateTransactionNos(txClient, 1))[0];
}

export async function generateTransactionNos(
  txClient: any = prisma,
  count = 1,
): Promise<string[]> {
  const totalCount = Math.max(0, Math.floor(count));

  if (totalCount === 0) {
    return [];
  }

  const today = new Date();
  
  // Format date as YYYYMMDD
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Find the last transaction created today
  const lastTransaction = await txClient.transaction.findFirst({
    where: {
      transactionNo: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      transactionNo: 'desc',
    },
    select: {
      transactionNo: true,
    }
  });

  let nextSequence = 1;

  if (lastTransaction && lastTransaction.transactionNo) {
    // Extract the sequence number after the "-" and add 1
    const lastSequenceStr = lastTransaction.transactionNo.split('-')[1];
    if (lastSequenceStr) {
      nextSequence = parseInt(lastSequenceStr, 10) + 1;
    }
  }

  return Array.from({ length: totalCount }, (_value, index) => {
    // Pad the sequence with zeros to ensure it is 8 digits long
    const sequenceStr = String(nextSequence + index).padStart(8, '0');

    return `${datePrefix}-${sequenceStr}`;
  });
}

// ==========================================
// 4. SYNC HELPER (LEDGER TO BILLING ENGINE)
// ==========================================

/**
 * Ensures that any reversal or adjustment applied to the Ledger (Transactions)
 * is accurately mathematically mirrored in the MonthlyCharge and Arrears tables.
 */
async function applyFinancialDeltaToBilling(
  tx: any, 
  residentId: string,
  transactionDate: Date,
  category: TransactionCategory,
  deltaAmount: number,
  remarks: string
) {
  if (!residentId || deltaAmount === 0) return;

  // 1. Force the date to the 1st of the transaction's month to find the correct MonthlyCharge
  const chargeMonth = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);

  let monthlyCharge = await tx.monthlyCharge.findUnique({
    where: { residentId_chargeMonth: { residentId, chargeMonth } }
  });

  if (!monthlyCharge) {
    monthlyCharge = await tx.monthlyCharge.create({
      data: { residentId, chargeMonth }
    });
  }

  let arrearsDelta = 0;

  // 2. Apply the mathematical delta to the exact correct category
  switch (category) {
    case "CAJ_SEWA":
      await tx.monthlyCharge.update({ where: { id: monthlyCharge.id }, data: { rentalAmount: { increment: deltaAmount } } });
      arrearsDelta = deltaAmount;
      break;
    case "CAJ_PENYELENGGARAAN":
      await tx.monthlyCharge.update({ where: { id: monthlyCharge.id }, data: { maintenanceAmount: { increment: deltaAmount } } });
      arrearsDelta = deltaAmount;
      break;
    case "CAJ_PENALTI":
      await tx.monthlyCharge.update({ where: { id: monthlyCharge.id }, data: { penaltyAmount: { increment: deltaAmount } } });
      arrearsDelta = deltaAmount;
      break;
    case "CAJ_TAMBAHAN":
      // We explicitly create a nested item here so it renders individually in the Frontend Details Modal!
      await tx.additionalCharge.create({
        data: {
          monthlyChargeId: monthlyCharge.id,
          chargeDate: new Date(), // Time the adjustment was physically made
          description: `[Pelarasan] ${remarks}`,
          amount: deltaAmount
        }
      });
      await tx.monthlyCharge.update({ where: { id: monthlyCharge.id }, data: { additionalChargesTotal: { increment: deltaAmount } } });
      arrearsDelta = deltaAmount;
      break;
    case "REBAT":
      await tx.rebate.create({
        data: {
          monthlyChargeId: monthlyCharge.id,
          rebateDate: new Date(),
          description: `[Pelarasan] ${remarks}`,
          amount: deltaAmount
        }
      });
      await tx.monthlyCharge.update({ where: { id: monthlyCharge.id }, data: { rebateTotal: { increment: deltaAmount } } });
      arrearsDelta = -deltaAmount; // Rebates lower arrears. So +Rebate = -Arrears
      break;
    case "BAYARAN":
      await tx.monthlyCharge.update({ where: { id: monthlyCharge.id }, data: { paymentReceived: { increment: deltaAmount } } });
      arrearsDelta = -deltaAmount; // Payments lower arrears. So +Payment = -Arrears
      break;
    default:
      // Fallback for BAKI_AWAL or LAIN_LAIN to ensure the master total is always updated
      arrearsDelta = deltaAmount;
      break;
  }

  // 3. Keep the global Arrears Summary updated
  if (arrearsDelta !== 0) {
    await tx.arrearsSummary.upsert({
      where: { residentId: residentId },
      create: { residentId: residentId, totalArrearsAmount: arrearsDelta },
      update: { totalArrearsAmount: { increment: arrearsDelta } }
    });
  }
}
