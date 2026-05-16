import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    // Force to the 1st of the current month
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // 1. Check if THIS month has been successfully billed
    const currentCycle = await prisma.billingCycle.findUnique({
      where: { billingMonth: currentMonth }
    });

    // 2. Find the absolute last time the system ran successfully (for UI display)
    const lastCycle = await prisma.billingCycle.findFirst({
      where: { success: true },
      orderBy: { runDate: 'desc' }
    });

    return NextResponse.json({
      ok: true,
      isBilledThisMonth: !!(currentCycle && currentCycle.success),
      lastBilledDate: lastCycle ? lastCycle.runDate : null
    });
  } catch (error) {
    console.error("[BILLING_STATUS_ERROR]", error);
    return NextResponse.json({ ok: false, isBilledThisMonth: false, lastBilledDate: null });
  }
}