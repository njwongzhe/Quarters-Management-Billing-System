import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPreviousBillingPeriod } from "@/lib/billing/billing-period";

export async function GET() {
  try {
    const {
      billingMonth,
      label: billingMonthLabel,
    } = getPreviousBillingPeriod();
    
    // 1. Check if the target billing month has been successfully billed
    const currentCycle = await prisma.billingCycle.findUnique({
      where: { billingMonth }
    });

    // 2. Find the absolute last time the system ran successfully (for UI display)
    const lastCycle = await prisma.billingCycle.findFirst({
      where: { success: true },
      orderBy: { runDate: 'desc' }
    });

    return NextResponse.json({
      ok: true,
      isBilledThisMonth: !!(currentCycle && currentCycle.success),
      lastBilledDate: lastCycle ? lastCycle.runDate : null,
      targetBillingMonth: billingMonth,
      targetBillingMonthLabel: billingMonthLabel,
    });
  } catch (error) {
    console.error("[BILLING_STATUS_ERROR]", error);
    return NextResponse.json({ ok: false, isBilledThisMonth: false, lastBilledDate: null });
  }
}
