import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/dashboard/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(
      { success: true, data: summary },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    console.error("[GET_DASHBOARD_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Ralat sistem semasa memuatkan data papan pemuka." },
      { status: 500 }
    );
  }
}
