import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const aiServiceBaseUrl =
      process.env.AI_SERVICE_URL ??
      process.env.NEXT_PUBLIC_AI_SERVICE_URL ??
      "http://127.0.0.1:8000";

    const response = await fetch(`${aiServiceBaseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        online: false,
        message: `Perkhidmatan AI bertindak balas dengan status: ${response.status}`,
      });
    }

    const data = await response.json().catch(() => null);
    if (data?.status === "ok") {
      return NextResponse.json({
        success: true,
        online: true,
      });
    }

    return NextResponse.json({
      success: true,
      online: false,
      message: "Respon status perkhidmatan AI tidak sah.",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      online: false,
      message: error instanceof Error ? error.message : "Perkhidmatan AI tidak dapat dihubungi.",
    });
  }
}
