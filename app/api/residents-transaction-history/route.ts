import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TransactionRecord = {
  id: string;
  tarikh: string;
  kategori: string;
  catatan: string;
  debit: number;
  kredit: number;
};

function formatTransactionCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    BAYARAN: "Bayaran",
    CAJ_SEWA: "Caj Sewa",
    CAJ_PENYELENGGARAAN: "Caj Penyelenggaraan",
    CAJ_PENALTI: "Caj Penalti",
    CAJ_TAMBAHAN: "Caj Tambahan",
    REBAT: "Rebat",
    BAKI_AWAL: "Baki Awal",
    LAIN_LAIN: "Lain-lain",
  };
  return categoryMap[category] || category;
}

function mapTransactionForApi(transaction: {
  id: string;
  transactionDate: Date;
  category: string;
  description: string | null;
  debitAmount: number | { toString(): string };
  creditAmount: number | { toString(): string };
}): TransactionRecord {
  return {
    id: transaction.id,
    tarikh: transaction.transactionDate.toLocaleDateString("ms-MY", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    kategori: formatTransactionCategory(transaction.category),
    catatan: transaction.description || "",
    debit: Number(transaction.debitAmount),
    kredit: Number(transaction.creditAmount),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get("residentId");

    // Validate resident ID
    if (!residentId) {
      return NextResponse.json(
        {
          success: false,
          message: "residentId parameter is required",
          errorCode: "MISSING_RESIDENT_ID",
        },
        { status: 400 }
      );
    }

    // Verify resident exists
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: { id: true },
    });

    if (!resident) {
      return NextResponse.json(
        {
          success: false,
          message: "Penghuni tidak ditemui",
          errorCode: "RESIDENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Fetch transactions for the resident, ordered by date descending
    const transactions = await prisma.transaction.findMany({
      where: {
        residentId: residentId,
      },
      select: {
        id: true,
        transactionDate: true,
        category: true,
        description: true,
        debitAmount: true,
        creditAmount: true,
      },
      orderBy: {
        transactionDate: "desc",
      },
    });

    // Map transactions to API response format
    const mappedTransactions = transactions.map(mapTransactionForApi);

    return NextResponse.json(
      {
        success: true,
        message: "Sejarah transaksi berjaya diambil",
        data: mappedTransactions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching transaction history:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat ketika mengambil sejarah transaksi",
        errorCode: "FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}
