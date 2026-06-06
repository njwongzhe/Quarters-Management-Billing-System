import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Gunakan /api/residents/[id]/update untuk mengemas kini atau /api/residents/[id]/delete untuk memadamkan." },
    { status: 405 }
  );
}
