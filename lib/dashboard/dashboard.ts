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

type DashboardCategoryAnalysisRow = {
  categoryName: string;
  totalOutstanding: unknown;
  totalPaid: unknown;
};

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
    unitStatusCounts,
    arrearsSummary,
    arrearsCount,
    pendingDocsByCategory,
    pendingUploadsToday,
    categoryAnalysisRows,
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
    prisma.unit.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
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
    prisma.uploadedDocument.groupBy({
      by: ["category"],
      where: {
        OR: [
          { residentDrafts: { some: {} } },
          { paymentDrafts: { some: {} } },
          { arrearsSummaryDrafts: { some: {} } },
          { unitDrafts: { some: {} } },
          { quarterCategoryDrafts: { some: {} } },
        ],
      },
      _count: {
        _all: true,
      },
    }),
    // Daily Uploads count today
    prisma.uploadedDocument.count({
      where: { uploadedAt: { gte: startOfToday } },
    }),
    prisma.$queryRaw<DashboardCategoryAnalysisRow[]>`
      WITH resident_payments AS (
        SELECT
          "residentId",
          SUM("amount") AS "totalPaid"
        FROM "Payment"
        GROUP BY "residentId"
      )
      SELECT
        qc."categoryName",
        COALESCE(
          SUM(
            CASE
              WHEN COALESCE(a."totalArrearsAmount", 0) > 0
                THEN a."totalArrearsAmount"
              ELSE 0
            END
          ),
          0
        ) AS "totalOutstanding",
        COALESCE(SUM(COALESCE(rp."totalPaid", 0)), 0) AS "totalPaid"
      FROM "QuarterCategory" qc
      LEFT JOIN "Unit" u
        ON u."categoryId" = qc."id"
      LEFT JOIN "UnitOccupancy" o
        ON o."unitId" = u."id"
        AND o."status" = 'CURRENT'::"OccupancyStatus"
      LEFT JOIN "ArrearsSummary" a
        ON a."residentId" = o."residentId"
      LEFT JOIN resident_payments rp
        ON rp."residentId" = o."residentId"
      GROUP BY qc."id", qc."categoryName"
      ORDER BY qc."categoryName" ASC
    `,
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
  const pendingCount = pendingDocsByCategory.reduce(
    (total, row) => total + row._count._all,
    0,
  );
  const pendingCategories = new Set(
    pendingDocsByCategory.map((row) => row.category),
  );
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

  const analysis = categoryAnalysisRows.map((category) => {
    const totalOutstanding = Number(category.totalOutstanding || 0);
    const totalPaid = Number(category.totalPaid || 0);

    const totalExpected = totalPaid + totalOutstanding;
    const settlementRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    return {
      className: category.categoryName,
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
  const occupiedUnits =
    unitStatusCounts.find((row) => row.status === "OCCUPIED")?._count._all ?? 0;
  const vacantUnits =
    unitStatusCounts.find((row) => row.status === "VACANT")?._count._all ?? 0;
  const totalUnits = occupiedUnits + vacantUnits;

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
