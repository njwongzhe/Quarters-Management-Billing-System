import { NextRequest, NextResponse } from "next/server";
import { getTransactionsList, getTransactionsSummary, TransactionFilterParams } from "@/lib/transactions/transactions";
import { TransactionCategory, TransactionStatus } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth/current-admin";

const transactionCategories = new Set(Object.values(TransactionCategory));
const transactionStatuses = new Set(Object.values(TransactionStatus));
const transactionTypes = new Set(["DEBIT", "CREDIT"]);

export async function GET(request: NextRequest) {
  try {
    // 1. SECURITY MIDDLEWARE VERIFICATION GUARD
    const authData = await getCurrentAdmin();
    if (!authData || !authData.profile) {
      return NextResponse.json(
        { ok: false, message: "Akses Ditolak. Sesi tamat atau anda tidak dibenarkan." },
        { status: 401 }
      );
    }

    // 2. PARSE AND EXTRACT INCOMING SEARCH PARAMS VALUES CLEANLY
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10),
    );

    // Explicit validation array conversions mappings
    const categoriesParam = searchParams.get("categories");
    const categories = categoriesParam
      ? categoriesParam
          .split(",")
          .filter((v): v is TransactionCategory => transactionCategories.has(v as TransactionCategory))
      : undefined;

    const statusesParam = searchParams.get("statuses");
    const statuses = statusesParam
      ? statusesParam
          .split(",")
          .filter((v): v is TransactionStatus => transactionStatuses.has(v as TransactionStatus))
      : undefined;

    const rawType = searchParams.get("type");
    const type = rawType && transactionTypes.has(rawType) ? (rawType as "DEBIT" | "CREDIT") : undefined;

    const params: TransactionFilterParams = {
      search, startDate, endDate, categories, statuses, type, page, limit,
    };

    // Conditional controller optimization evaluation anchor
    const includeSummary = searchParams.get("includeSummary") !== "false";

    // 3. EXECUTE REVENUE FLOW HANDLING PROMISES CONCURRENTLY
    const [listResult, summaryResult] = includeSummary
      ? await Promise.all([
          getTransactionsList(params),
          getTransactionsSummary(params),
        ])
      : [await getTransactionsList(params), undefined];

    // 4. EMIT FINAL STRUCTURAL JSON STREAM SPECIFICATIONS
    return NextResponse.json({
      ok: true,
      data: listResult.data,
      meta: {
        total: listResult.total,
        page: listResult.page,
        totalPages: listResult.totalPages,
        summary: summaryResult // Returns completely un-allocated (undefined) when skipped during pagination
      }
    });
  } catch (error: any) {
    console.error("[API_TRANSACTIONS_GET_FATAL_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Ralat semasa mengambil data transaksi." },
      { status: 500 }
    );
  }
}