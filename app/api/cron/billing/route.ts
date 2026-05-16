import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTransactionNo } from "@/lib/transactions"; // Ensure this path is correct

// Vercel Cron Jobs send a GET request
export async function GET(request: Request) {
  try {
    //todo
    // 1. SECURE THE ROUTE (Optional but recommended for Vercel)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    // 2. IDENTIFY THE CURRENT BILLING MONTH
    const today = new Date();
    // We force the date to the 1st of the current month (e.g., 2026-05-01 00:00:00)
    const currentBillingMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate total days in the current month for prorated math
    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // 3. THE SAFETY CHECK (THE LOCK)
    const existingCycle = await prisma.billingCycle.findUnique({
      where: { billingMonth: currentBillingMonth }
    });

    if (existingCycle && existingCycle.success) {
      // Abort safely! It has already been run this month.
      return NextResponse.json({ 
        ok: true, 
        message: `Batal: Caj untuk bulan ${currentBillingMonth.toLocaleDateString()} telah pun dijana.`,
        data: existingCycle 
      });
    }

    // 4. FETCH ACTIVE RESIDENTS AND THEIR UNITS
    // We only want people who actually have a 'CURRENT' unit occupancy
    const residentsInfo = await prisma.resident.findMany({
      where: {
        recordStatus: "VERIFIED",
        occupancies: { some: { status: "CURRENT" } }
      },
      include: {
        occupancies: {
          where: { status: "CURRENT" },
          include: { unit: { include: { quarterCategory: true } } }
        }
      }
    });

    let recordsProcessed = 0;

    // 5. RUN THE MASSIVE DATABASE TRANSACTION
    await prisma.$transaction(async (tx) => {
      
      for (const resident of residentsInfo) {
        const occupancy = resident.occupancies[0]; // Assuming 1 active unit per resident
        if (!occupancy || !occupancy.unit.quarterCategory) continue;

        const categoryPrices = occupancy.unit.quarterCategory;
        const standardRental = Number(categoryPrices.rentalPrice);
        const penaltyAmount = Number(categoryPrices.penaltyPrice);

        // --- MATH: CALCULATE PRORATED RENT (FOR MOVE-OUTS) ---
        let finalRentalToCharge = standardRental;
        
        // If they have a moveOutDate AND it falls within this current billing month
        if (occupancy.moveOutDate) {
          const moveOutDate = new Date(occupancy.moveOutDate);
          if (moveOutDate.getFullYear() === currentBillingMonth.getFullYear() && 
              moveOutDate.getMonth() === currentBillingMonth.getMonth()) {
            
            // They only pay for the days they stayed
            const daysStayed = moveOutDate.getDate();
            finalRentalToCharge = (standardRental / totalDaysInMonth) * daysStayed;
          }
        }

        // --- DATABASE ACTIONS FOR THIS RESIDENT ---
        
        // A. Find or Create the Monthly Charge Summary
        let monthlyCharge = await tx.monthlyCharge.findUnique({
          where: { residentId_chargeMonth: { residentId: resident.id, chargeMonth: currentBillingMonth } }
        });

        if (!monthlyCharge) {
          monthlyCharge = await tx.monthlyCharge.create({
            data: {
              residentId: resident.id,
              chargeMonth: currentBillingMonth,
              unitId: occupancy.unitId,
              rentalAmount: finalRentalToCharge, // Set the rental
              penaltyAmount: resident.status === "TIDAK_LAYAK" ? penaltyAmount : 0 // Apply Penalty if TIDAK_LAYAK
            }
          });
        }

        let totalNewCharges = 0;

        // B. Generate Ledger Transaction for RENTAL
        if (finalRentalToCharge > 0 && Number(monthlyCharge.rentalAmount) === 0) {
          const txNoSewa = await generateTransactionNo(tx);
          await tx.transaction.create({
            data: {
              transactionNo: txNoSewa,
              residentId: resident.id,
              transactionDate: today,
              category: "CAJ_SEWA",
              debitAmount: finalRentalToCharge,
              description: occupancy.moveOutDate ? "Caj Sewa (Prorata Pindah Keluar)" : "Caj Sewa Bulanan",
            }
          });
          totalNewCharges += finalRentalToCharge;
        }

        // C. Generate Ledger Transaction for PENALTY (If TIDAK_LAYAK)
        if (resident.status === "TIDAK_LAYAK" && Number(monthlyCharge.penaltyAmount) === 0) {
          const txNoPenalti = await generateTransactionNo(tx);
          await tx.transaction.create({
            data: {
              transactionNo: txNoPenalti,
              residentId: resident.id,
              transactionDate: today,
              category: "CAJ_PENALTI",
              debitAmount: penaltyAmount,
              description: "Denda / Penalti Hilang Kelayakan",
            }
          });
          totalNewCharges += penaltyAmount;
        }

        // D. Kemaskini Jadual MonthlyCharge supaya "Sewa" muncul di jadual frontend
        if (totalNewCharges > 0) {
          await tx.monthlyCharge.update({
            where: { id: monthlyCharge.id },
            data: {
              rentalAmount: finalRentalToCharge,
              penaltyAmount: resident.status === "TIDAK_LAYAK" ? penaltyAmount : 0
            }
          });

          // E. Update Master Arrears Summary (Jumlah Tunggakan)
          await tx.arrearsSummary.upsert({
            where: { residentId: resident.id },
            create: {
              residentId: resident.id,
              totalArrearsAmount: totalNewCharges,
            },
            update: {
              totalArrearsAmount: { increment: totalNewCharges }
            }
          });
          recordsProcessed++;
        }
      }

      // 6. CREATE THE LOCK RECORD (Crucial Step)
      // This tells the system that May 2026 is officially done.
      await tx.billingCycle.create({
        data: {
          billingMonth: currentBillingMonth,
          runDate: today,
          success: true,
          recordsBilled: recordsProcessed
        }
      });

    }, 
    {
      maxWait: 5000,
      timeout: 30000 // Give it 30 seconds to process all residents
    });

    return NextResponse.json({ 
      ok: true, 
      message: `Berjaya: Caj untuk ${currentBillingMonth.toLocaleDateString()} telah dijana.`,
      recordsProcessed
    });

  } catch (error) {
    console.error("[CRON_BILLING_ERROR]", error);
    return NextResponse.json({ ok: false, message: "Ralat sistem semasa menjana bil bulanan." }, { status: 500 });
  }
}