import { prisma } from "@/lib/prisma";
import { getMonthStartInAppTimeZone, getTodayDateInAppTimeZone, getAppTimeZoneDateParts } from "@/lib/date-time";

export interface DashboardSummaryData {
  monthlyAmount: string;
  monthlyChange: string;
  monthlyPercentage: number;
  
  totalAmount: string;
  totalChange: string;
  totalPercentage: number;
  
  occupancyTotal: number;
  occupancyOccupied: number;
  occupancyVacant: number;
  
  arrearsAmount: string;
  arrearsCount: number;
  pendingCount: number;
  pendingUploadsToday: number;
  pendingCategory?: string;
  
  analysis: Array<{
    className: string;
    amount: string;
    settlementRate: number;
    opacity: number;
  }>;
}

export async function getDashboardSummary(): Promise<DashboardSummaryData> {
  const today = new Date();

  // 1. Determine Target Billing Month (Latest successfully billed period) - Run this quickly first
  const latestCycle = await prisma.billingCycle.findFirst({
    where: { success: true },
    orderBy: { billingMonth: "desc" },
  });

  const { year: curYear, month: curMonth } = getAppTimeZoneDateParts(today);
  const targetMonth = latestCycle?.billingMonth || new Date(Date.UTC(curYear, curMonth - 2, 1));

  // Pre-calculate date ranges
  const startOfCalendarMonth = getMonthStartInAppTimeZone(today);
  
  const prevMonthDate = new Date(today);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const startOfPrevCalendarMonth = getMonthStartInAppTimeZone(prevMonthDate);

  const startOfThisYear = new Date(Date.UTC(curYear, 0, 1, 0, 0, 0, 0));
  const startOfLastYear = new Date(Date.UTC(curYear - 1, 0, 1, 0, 0, 0, 0));
  const samePeriodLastYear = new Date(today);
  samePeriodLastYear.setFullYear(samePeriodLastYear.getFullYear() - 1);

  const startOfToday = getTodayDateInAppTimeZone();

  // 2. Parallelize all remaining database operations (concurrency optimization)
  const [
    currentMonthCollections,
    prevMonthCollections,
    allTimeCollections,
    thisYearCollections,
    lastYearCollections,
    billingSummary,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    arrearsSummary,
    arrearsCount,
    pendingDocs,
    pendingUploadsToday,
    activeOccupancies,
    paymentSums,
    categories
  ] = await Promise.all([
    // Current Month's Collections
    prisma.payment.aggregate({
      where: { paymentDate: { gte: startOfCalendarMonth } },
      _sum: { amount: true },
    }),
    // Previous Month's Collections
    prisma.payment.aggregate({
      where: {
        paymentDate: {
          gte: startOfPrevCalendarMonth,
          lt: startOfCalendarMonth,
        },
      },
      _sum: { amount: true },
    }),
    // All-Time Collections
    prisma.payment.aggregate({
      _sum: { amount: true },
    }),
    // This Year's YTD Collections
    prisma.payment.aggregate({
      where: { paymentDate: { gte: startOfThisYear } },
      _sum: { amount: true },
    }),
    // Last Year's Collections (Same Period)
    prisma.payment.aggregate({
      where: {
        paymentDate: {
          gte: startOfLastYear,
          lt: samePeriodLastYear,
        },
      },
      _sum: { amount: true },
    }),
    // Target Month Billing Details
    prisma.monthlyCharge.aggregate({
      where: { chargeMonth: targetMonth },
      _sum: { totalMonthlyCharge: true, paymentReceived: true },
    }),
    // Total Units Count
    prisma.unit.count(),
    // Occupied Units Count
    prisma.unit.count({
      where: { status: "OCCUPIED" },
    }),
    // Vacant Units Count
    prisma.unit.count({
      where: { status: "VACANT" },
    }),
    // Master Arrears aggregate
    prisma.arrearsSummary.aggregate({
      where: { totalArrearsAmount: { gt: 0 } },
      _sum: { totalArrearsAmount: true },
    }),
    // Residents count with arrears
    prisma.arrearsSummary.count({
      where: { totalArrearsAmount: { gt: 0 } },
    }),
    // Pending documents drafts
    prisma.uploadedDocument.findMany({
      where: {
        OR: [
          { residentDrafts: { some: {} } },
          { paymentDrafts: { some: {} } },
          { arrearsSummaryDrafts: { some: {} } },
          { unitDrafts: { some: {} } },
          { quarterCategoryDrafts: { some: {} } },
        ],
      },
      select: {
        category: true,
      },
    }),
    // Daily Uploads count today
    prisma.uploadedDocument.count({
      where: { uploadedAt: { gte: startOfToday } },
    }),
    // Category Analysis: fetch current occupants and their arrears in a flat query
    prisma.unitOccupancy.findMany({
      where: { status: "CURRENT" },
      select: {
        residentId: true,
        unit: { select: { categoryId: true } },
        resident: {
          select: {
            arrearsSummary: { select: { totalArrearsAmount: true } },
          },
        },
      },
    }),
    // Category Analysis: sum payments grouped by resident ID in the DB
    prisma.payment.groupBy({
      by: ["residentId"],
      _sum: { amount: true },
    }),
    // Categories List
    prisma.quarterCategory.findMany({
      select: { id: true, categoryName: true },
    }),
  ]);

  // --- Calculate Collections Metrics ---
  const curKutipan = Number(currentMonthCollections._sum.amount || 0);
  const prevKutipan = Number(prevMonthCollections._sum.amount || 0);

  let percentChangeStr = "+0.0%";
  if (prevKutipan > 0) {
    const change = ((curKutipan - prevKutipan) / prevKutipan) * 100;
    percentChangeStr = (change >= 0 ? "+" : "") + change.toFixed(1) + "%";
  } else if (curKutipan > 0) {
    percentChangeStr = "+100.0%";
  }

  const totalKutipanVal = Number(allTimeCollections._sum.amount || 0);
  const thisYearVal = Number(thisYearCollections._sum.amount || 0);
  const lastYearVal = Number(lastYearCollections._sum.amount || 0);

  let ytdChangeStr = "+0.0% YTD";
  if (lastYearVal > 0) {
    const change = ((thisYearVal - lastYearVal) / lastYearVal) * 100;
    ytdChangeStr = (change >= 0 ? "+" : "") + change.toFixed(1) + "% YTD";
  } else if (thisYearVal > 0) {
    ytdChangeStr = "+100.0% YTD";
  }

  // --- Calculate Targets Completion ---
  const totalBilled = Number(billingSummary._sum.totalMonthlyCharge || 0);
  const totalCollected = Number(billingSummary._sum.paymentReceived || 0);
  const monthlyPercentage = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const totalArrearsVal = Number(arrearsSummary._sum.totalArrearsAmount || 0);
  const totalExpectedAllTime = totalKutipanVal + totalArrearsVal;
  const totalPercentage = totalExpectedAllTime > 0 ? Math.round((totalKutipanVal / totalExpectedAllTime) * 100) : 0;

  // --- Calculate Semakan / Pending Redirection ---
  const pendingCount = pendingDocs.length;
  const pendingCategories = new Set(pendingDocs.map((doc) => doc.category));
  let pendingCategory = "bayaran"; // Default fallback
  if (pendingCategories.has("BAYARAN")) {
    pendingCategory = "bayaran";
  } else if (pendingCategories.has("TUNGGAKAN")) {
    pendingCategory = "tunggakan";
  } else if (pendingCategories.has("PENGHUNI")) {
    pendingCategory = "penghuni";
  } else if (pendingCategories.has("KUARTERS")) {
    pendingCategory = "kuarters";
  }

  // --- Calculate Category Arrears analysis ---
  // Create a map of payment sums by residentId
  const paymentMap = new Map<string, number>();
  paymentSums.forEach((item) => {
    paymentMap.set(item.residentId, Number(item._sum.amount || 0));
  });

  // Aggregate outstanding arrears and payment totals per category
  const categoryOutstandingMap = new Map<string, number>();
  const categoryPaidMap = new Map<string, number>();

  activeOccupancies.forEach((occ) => {
    const categoryId = occ.unit.categoryId;
    const outstanding = Number(occ.resident.arrearsSummary?.totalArrearsAmount || 0);
    const paid = paymentMap.get(occ.residentId) || 0;

    categoryOutstandingMap.set(
      categoryId,
      (categoryOutstandingMap.get(categoryId) || 0) + (outstanding > 0 ? outstanding : 0)
    );
    categoryPaidMap.set(
      categoryId,
      (categoryPaidMap.get(categoryId) || 0) + paid
    );
  });

  // Map to final format
  const analysis = categories.map((cat) => {
    const totalOutstanding = categoryOutstandingMap.get(cat.id) || 0;
    const totalPaid = categoryPaidMap.get(cat.id) || 0;

    const totalExpected = totalPaid + totalOutstanding;
    const settlementRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    return {
      className: cat.categoryName,
      amountVal: totalOutstanding,
      amount: `RM ${totalOutstanding.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`,
      settlementRate,
    };
  });

  // Sort by outstanding amount descending (high to low), then alphabetically by category name
  analysis.sort((a, b) => {
    if (b.amountVal !== a.amountVal) {
      return b.amountVal - a.amountVal;
    }
    return a.className.localeCompare(b.className);
  });

  const formattedAnalysis = analysis.map((item, idx) => ({
    className: item.className,
    amount: item.amount,
    settlementRate: item.settlementRate,
    opacity: idx === 0 ? 1.0 : idx === 1 ? 0.7 : 0.4,
  }));

  return {
    monthlyAmount: `RM ${curKutipan.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`,
    monthlyChange: percentChangeStr,
    monthlyPercentage,
    
    totalAmount: `RM ${totalKutipanVal.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`,
    totalChange: ytdChangeStr,
    totalPercentage,
    
    occupancyTotal: totalUnits || 1450,
    occupancyOccupied: occupiedUnits || 1087,
    occupancyVacant: vacantUnits || 363,
    
    arrearsAmount: `RM ${totalArrearsVal.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`,
    arrearsCount: arrearsCount || 0,
    pendingCount: pendingCount || 0,
    pendingUploadsToday: pendingUploadsToday || 0,
    pendingCategory,
    
    analysis: formattedAnalysis.length > 0 ? formattedAnalysis : [
      { className: "Jalan Ariffin", amount: "RM 0.00", settlementRate: 0, opacity: 1.0 },
      { className: "Taman Nusantara", amount: "RM 0.00", settlementRate: 0, opacity: 0.7 },
      { className: "Persiaran Tanjung", amount: "RM 0.00", settlementRate: 0, opacity: 0.4 },
    ],
  };
}
