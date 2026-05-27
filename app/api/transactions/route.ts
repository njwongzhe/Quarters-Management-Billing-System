import { NextRequest, NextResponse } from "next/server";
import { getTransactionsList, getTransactionsSummary, TransactionFilterParams } from "@/lib/transactions/transactions";
import { TransactionCategory, TransactionStatus } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

export async function GET(request: NextRequest) {
  try {
    // 1. SECURITY CHECK: Ensure only logged-in admins can view the ledger
    const authData = await getCurrentAdmin();
    if (!authData || !authData.profile) {
      return NextResponse.json(
        { ok: false, message: "Akses Ditolak. Sesi tamat atau anda tidak dibenarkan." },
        { status: 401 }
      );
    }

    // 2. PARSE QUERY PARAMETERS (Filters from the frontend)
    const searchParams = request.nextUrl.searchParams;

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

    const type = (searchParams.get("type") as "DEBIT" | "CREDIT") || undefined;

    const params: TransactionFilterParams = {
      search,
      startDate,
      endDate,
      categories,
      statuses,
      type,
      page,
      limit,
    };

    // 3. FETCH DATA (Run both queries simultaneously for performance)
    const [listResult, summaryResult] = await Promise.all([
      getTransactionsList(params),
      getTransactionsSummary() 
    ]);

    // 4. RETURN RESPONSE
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