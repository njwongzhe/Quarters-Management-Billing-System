import { NextRequest, NextResponse } from "next/server";
import { getTransactionsList, getTransactionsSummary, TransactionFilterParams } from "@/lib/transactions";
import { TransactionCategory, TransactionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse the query parameters sent from the frontend filter panel
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Handle Enums arrays (e.g., categories=BAYARAN,CAJ_SEWA)
    const categoriesParam = searchParams.get("categories");
    const categories = categoriesParam ? (categoriesParam.split(",") as TransactionCategory[]) : undefined;

    const statusesParam = searchParams.get("statuses");
    const statuses = statusesParam ? (statusesParam.split(",") as TransactionStatus[]) : undefined;

    const params: TransactionFilterParams = {
      search,
      startDate,
      endDate,
      categories,
      statuses,
      page,
      limit,
    };

    // Run both queries simultaneously for performance
    const [listResult, summaryResult] = await Promise.all([
      getTransactionsList(params),
      getTransactionsSummary() // We fetch the summary KPIs at the same time!
    ]);

    return NextResponse.json({
      ok: true,
      data: listResult.data,
      meta: {
        total: listResult.total,
        page: listResult.page,
        totalPages: listResult.totalPages,
        summary: summaryResult
      }
    });

  } catch (error: any) {
    console.error("[API_TRANSACTIONS_GET]", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Ralat semasa mengambil data transaksi." },
      { status: 500 }
    );
  }
}