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
  
  analysis: Array<{
    className: string;
    amount: string;
    settlementRate: number;
    opacity: number;
  }>;
}

export async function getDashboardSummary(): Promise<DashboardSummaryData> {
  const today = new Date();

  // 1. Determine Target Billing Month (Latest successfully billed period)
  const latestCycle = await prisma.billingCycle.findFirst({
    where: { success: true },
    orderBy: { billingMonth: "desc" },
  });

  const { year: curYear, month: curMonth } = getAppTimeZoneDateParts(today);
  const targetMonth = latestCycle?.billingMonth || new Date(Date.UTC(curYear, curMonth - 2, 1));

  // 2. Calculate Current Month's Collections (Jumlah Kutipan Bulan Ini) using the Payment table
  const startOfCalendarMonth = getMonthStartInAppTimeZone(today);
  
  const prevMonthDate = new Date(today);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const startOfPrevCalendarMonth = getMonthStartInAppTimeZone(prevMonthDate);

  const currentMonthCollections = await prisma.payment.aggregate({
    where: {
      paymentDate: { gte: startOfCalendarMonth },
    },
    _sum: { amount: true },
  });

  const prevMonthCollections = await prisma.payment.aggregate({
    where: {
      paymentDate: {
        gte: startOfPrevCalendarMonth,
        lt: startOfCalendarMonth,
      },
    },
    _sum: { amount: true },
  });

  const curKutipan = Number(currentMonthCollections._sum.amount || 0);
  const prevKutipan = Number(prevMonthCollections._sum.amount || 0);

  // Calculate percentage change compared to last month
  let percentChangeStr = "+0.0%";
  if (prevKutipan > 0) {
    const change = ((curKutipan - prevKutipan) / prevKutipan) * 100;
    percentChangeStr = (change >= 0 ? "+" : "") + change.toFixed(1) + "%";
  } else if (curKutipan > 0) {
    percentChangeStr = "+100.0%";
  }

  // 3. Calculate All-Time Collections (Jumlah Keseluruhan Kutipan) and YTD Growth using the Payment table
  const allTimeCollections = await prisma.payment.aggregate({
    _sum: { amount: true },
  });

  const totalKutipanVal = Number(allTimeCollections._sum.amount || 0);

  const startOfThisYear = new Date(Date.UTC(curYear, 0, 1, 0, 0, 0, 0));
  const startOfLastYear = new Date(Date.UTC(curYear - 1, 0, 1, 0, 0, 0, 0));
  const samePeriodLastYear = new Date(today);
  samePeriodLastYear.setFullYear(samePeriodLastYear.getFullYear() - 1);

  const thisYearCollections = await prisma.payment.aggregate({
    where: {
      paymentDate: { gte: startOfThisYear },
    },
    _sum: { amount: true },
  });

  const lastYearCollections = await prisma.payment.aggregate({
    where: {
      paymentDate: {
        gte: startOfLastYear,
        lt: samePeriodLastYear,
      },
    },
    _sum: { amount: true },
  });

  const thisYearVal = Number(thisYearCollections._sum.amount || 0);
  const lastYearVal = Number(lastYearCollections._sum.amount || 0);

  let ytdChangeStr = "+0.0% YTD";
  if (lastYearVal > 0) {
    const change = ((thisYearVal - lastYearVal) / lastYearVal) * 100;
    ytdChangeStr = (change >= 0 ? "+" : "") + change.toFixed(1) + "% YTD";
  } else if (thisYearVal > 0) {
    ytdChangeStr = "+100.0% YTD";
  }

  // 4. Calculate target completion rates dynamically
  
  // Monthly target completion rate (Monthly Collected vs Monthly Billed for target billing month)
  const billingSummary = await prisma.monthlyCharge.aggregate({
    where: { chargeMonth: targetMonth },
    _sum: { totalMonthlyCharge: true, paymentReceived: true },
  });

  const totalBilled = Number(billingSummary._sum.totalMonthlyCharge || 0);
  const totalCollected = Number(billingSummary._sum.paymentReceived || 0);
  const monthlyPercentage = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // All-time target completion rate (All-time Collected vs All-time Billed in MonthlyCharge table)
  const overallBillingSummary = await prisma.monthlyCharge.aggregate({
    _sum: { totalMonthlyCharge: true, paymentReceived: true },
  });

  const totalBilledAllTime = Number(overallBillingSummary._sum.totalMonthlyCharge || 0);
  const totalCollectedAllTime = Number(overallBillingSummary._sum.paymentReceived || 0);
  const totalPercentage = totalBilledAllTime > 0 ? Math.round((totalCollectedAllTime / totalBilledAllTime) * 100) : 0;

  // 5. Calculate Occupancy Status
  const totalUnits = await prisma.unit.count();
  const occupiedUnits = await prisma.unit.count({
    where: { status: "OCCUPIED" },
  });
  const vacantUnits = await prisma.unit.count({
    where: { status: "VACANT" },
  });

  // 6. Calculate Arrears Summary
  const arrearsSummary = await prisma.arrearsSummary.aggregate({
    where: { totalArrearsAmount: { gt: 0 } },
    _sum: { totalArrearsAmount: true },
  });

  const arrearsCount = await prisma.arrearsSummary.count({
    where: { totalArrearsAmount: { gt: 0 } },
  });

  const totalArrears = Number(arrearsSummary._sum.totalArrearsAmount || 0);

  // 7. Calculate Semakan (Pending documents queue size)
  const pendingCount = await prisma.uploadedDocument.count({
    where: {
      OR: [
        { residentDrafts: { some: {} } },
        { paymentDrafts: { some: {} } },
        { arrearsSummaryDrafts: { some: {} } },
        { unitDrafts: { some: {} } },
        { quarterCategoryDrafts: { some: {} } },
      ],
    },
  });

  const startOfToday = getTodayDateInAppTimeZone();
  const pendingUploadsToday = await prisma.uploadedDocument.count({
    where: {
      uploadedAt: { gte: startOfToday },
    },
  });

  // 8. Calculate Analisis Kelas (Arrears by quarters category)
  const categories = await prisma.quarterCategory.findMany({
    include: {
      units: {
        include: {
          occupancies: {
            where: { status: "CURRENT" },
            include: {
              resident: {
                include: {
                  arrearsSummary: true,
                },
              },
            },
          },
          monthlyCharges: {
            where: { chargeMonth: targetMonth },
            select: {
              totalMonthlyCharge: true,
              paymentReceived: true,
            },
          },
        },
      },
    },
  });

  const analysis = categories.map((cat) => {
    let totalOutstanding = 0;
    let catBilled = 0;
    let catPaid = 0;

    cat.units.forEach((unit) => {
      // 1. Accumulate total positive arrears from the current occupant
      const currentOccupancy = unit.occupancies[0];
      if (currentOccupancy?.resident?.arrearsSummary) {
        const arrVal = Number(currentOccupancy.resident.arrearsSummary.totalArrearsAmount || 0);
        if (arrVal > 0) {
          totalOutstanding += arrVal;
        }
      }

      // 2. Accumulate monthly charge statistics for settlement rate calculation
      unit.monthlyCharges.forEach((charge) => {
        catBilled += Number(charge.totalMonthlyCharge || 0);
        catPaid += Number(charge.paymentReceived || 0);
      });
    });

    const settlementRate = catBilled > 0 ? Math.round((catPaid / catBilled) * 100) : 0;

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
    
    arrearsAmount: `RM ${totalArrears.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}`,
    arrearsCount: arrearsCount || 0,
    pendingCount: pendingCount || 0,
    pendingUploadsToday: pendingUploadsToday || 0,
    
    analysis: formattedAnalysis.length > 0 ? formattedAnalysis : [
      { className: "Jalan Ariffin", amount: "RM 0.00", settlementRate: 0, opacity: 1.0 },
      { className: "Taman Nusantara", amount: "RM 0.00", settlementRate: 0, opacity: 0.7 },
      { className: "Persiaran Tanjung", amount: "RM 0.00", settlementRate: 0, opacity: 0.4 },
    ],
  };
}
