import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBillingDateKey,
  getBillingDayOfMonth,
  getPreviousBillingPeriod,
  isSameBillingMonth
} from "@/lib/billing/billing-period";
import { generateTransactionNos } from "@/lib/transactions/transactions"; // Ensure this path is correct

// Vercel Cron Jobs send a GET request
export async function GET() {
  try {
    //todo
    // 1. SECURE THE ROUTE (Optional but recommended for Vercel)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    // 2. IDENTIFY THE TARGET BILLING MONTH
    const today = new Date();
    const {
      billingMonth,
      billingMonthEnd,
      startDateKey,
      endDateKey,
      totalDaysInMonth,
      label: billingMonthLabel,
    } = getPreviousBillingPeriod(today);

    // 3. THE SAFETY CHECK (THE LOCK)
    const existingCycle = await prisma.billingCycle.findUnique({
      where: { billingMonth }
    });

    if (existingCycle && existingCycle.success) {
      // Abort safely! It has already been run this month.
      return NextResponse.json({ 
        ok: true, 
        message: `Batal: Caj untuk bulan ${billingMonthLabel} telah pun dijana.`,
        data: existingCycle 
      });
    }

    // 4. FETCH RESIDENTS WHO OCCUPIED A UNIT DURING THE TARGET BILLING MONTH
    const residentsInfo = await prisma.resident.findMany({
      where: {
        occupancies: {
          some: {
            moveInDate: { lte: billingMonthEnd },
            OR: [
              { status: "CURRENT" },
              { moveOutDate: { gte: billingMonth } }
            ]
          }
        }
      },
      include: {
        occupancies: {
          where: {
            moveInDate: { lte: billingMonthEnd },
            OR: [
              { status: "CURRENT" },
              { moveOutDate: { gte: billingMonth } }
            ]
          },
          orderBy: { moveInDate: "desc" },
          include: { unit: { include: { quarterCategory: true } } }
        }
      }
    });

    const currentCharges = await prisma.monthlyCharge.findMany({
      where: {
        chargeMonth: billingMonth,
        residentId: { in: residentsInfo.map((resident) => resident.id) }
      }
    });

    const chargeByResidentId = new Map(
      currentCharges.map((charge) => [charge.residentId, charge])
    );

    const billableItems = residentsInfo.flatMap((resident) => {
      const occupancy = resident.occupancies.find((item) => {
        const moveInKey = getBillingDateKey(item.moveInDate);
        const moveOutKey = item.moveOutDate ? getBillingDateKey(item.moveOutDate) : null;

        return moveInKey <= endDateKey && (!moveOutKey || moveOutKey >= startDateKey);
      }); // Pick the unit occupied during the target billing month.
      if (!occupancy || !occupancy.unit.quarterCategory) return [];

      const categoryPrices = occupancy.unit.quarterCategory;
      const standardRental = Number(categoryPrices.rentalPrice);
      const penaltyAmount = Number(categoryPrices.penaltyPrice);
      const currentCharge = chargeByResidentId.get(resident.id);

      // --- MATH: CALCULATE PRORATED RENT (FOR MOVE-OUTS) ---
      let finalRentalToCharge = standardRental;
      
      // If they have a moveOutDate AND it falls within this billing month
      if (occupancy.moveOutDate) {
        const moveOutDate = new Date(occupancy.moveOutDate);
        if (isSameBillingMonth(moveOutDate, billingMonth)) {
          
          // They only pay for the days they stayed
          const daysStayed = getBillingDayOfMonth(moveOutDate);
          finalRentalToCharge = (standardRental / totalDaysInMonth) * daysStayed;
        }
      }

      const rentalToAdd = !currentCharge || Number(currentCharge.rentalAmount) === 0
        ? Number(finalRentalToCharge.toFixed(2))
        : 0;
      const penaltyToAdd = resident.status === "TIDAK_LAYAK" && (!currentCharge || Number(currentCharge.penaltyAmount) === 0)
        ? penaltyAmount
        : 0;
      const totalNewCharges = rentalToAdd + penaltyToAdd;

      if (totalNewCharges <= 0) return [];

      return [{
        residentId: resident.id,
        unitId: occupancy.unitId,
        moveOutDate: occupancy.moveOutDate,
        rentalToAdd,
        penaltyToAdd,
        totalNewCharges,
      }];
    });

    const transactionCount = billableItems.reduce((count, item) => {
      return count + (item.rentalToAdd > 0 ? 1 : 0) + (item.penaltyToAdd > 0 ? 1 : 0);
    }, 0);
    const transactionNos = await generateTransactionNos(prisma, transactionCount);
    let transactionNoIndex = 0;
    const chunkSize = 10;

    for (let index = 0; index < billableItems.length; index += chunkSize) {
      const chunk = billableItems.slice(index, index + chunkSize);
      const transactionsToCreate = chunk.flatMap((item) => {
        const transactions = [];

        if (item.rentalToAdd > 0) {
          transactions.push({
            transactionNo: transactionNos[transactionNoIndex++],
            residentId: item.residentId,
            transactionDate: today,
            category: "CAJ_SEWA" as const,
            debitAmount: item.rentalToAdd,
            description: item.moveOutDate ? "Caj Sewa (Prorata Pindah Keluar)" : "Caj Sewa Bulanan",
          });
        }

        if (item.penaltyToAdd > 0) {
          transactions.push({
            transactionNo: transactionNos[transactionNoIndex++],
            residentId: item.residentId,
            transactionDate: today,
            category: "CAJ_PENALTI" as const,
            debitAmount: item.penaltyToAdd,
            description: "Denda / Penalti Hilang Kelayakan",
          });
        }

        return transactions;
      });

      await prisma.$transaction(
        async (tx) => {
          if (transactionsToCreate.length > 0) {
            await tx.transaction.createMany({ data: transactionsToCreate });
          }

          for (const item of chunk) {
            await tx.monthlyCharge.upsert({
              where: {
                residentId_chargeMonth: {
                  residentId: item.residentId,
                  chargeMonth: billingMonth
                }
              },
              create: {
                residentId: item.residentId,
                chargeMonth: billingMonth,
                unitId: item.unitId,
                rentalAmount: item.rentalToAdd,
                penaltyAmount: item.penaltyToAdd,
                totalMonthlyCharge: item.totalNewCharges,
                balanceForMonth: item.totalNewCharges,
              },
              update: {
                unitId: item.unitId,
                rentalAmount: { increment: item.rentalToAdd },
                penaltyAmount: { increment: item.penaltyToAdd },
                totalMonthlyCharge: { increment: item.totalNewCharges },
                balanceForMonth: { increment: item.totalNewCharges },
              }
            });

            await tx.arrearsSummary.upsert({
              where: { residentId: item.residentId },
              create: {
                residentId: item.residentId,
                totalArrearsAmount: item.totalNewCharges,
                lastUpdatedMonth: billingMonth,
              },
              update: {
                totalArrearsAmount: { increment: item.totalNewCharges },
                lastUpdatedMonth: billingMonth,
              }
            });
          }
        },
        {
          maxWait: 10000,
          timeout: 30000,
        }
      );
    }

    const recordsProcessed = billableItems.length;

    // 6. CREATE THE LOCK RECORD (Crucial Step)
    // This tells the system that the target billing month is officially done.
    await prisma.billingCycle.upsert({
      where: { billingMonth },
      create: {
        billingMonth,
        runDate: today,
        success: true,
        recordsBilled: recordsProcessed
      },
      update: {
        runDate: today,
        success: true,
        recordsBilled: recordsProcessed
      }
    });

    return NextResponse.json({ 
      ok: true, 
      message: `Berjaya: Caj untuk bulan ${billingMonthLabel} telah dijana.`,
      recordsProcessed
    });

  } catch (error) {
    console.error("[CRON_BILLING_ERROR]", error);
    return NextResponse.json({ ok: false, message: "Ralat sistem semasa menjana bil bulanan." }, { status: 500 });
  }
}
