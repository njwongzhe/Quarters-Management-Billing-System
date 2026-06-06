import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapTunggakanForApi, parseBulkUpdateBody } from "../../../lib/arrears/arrears";
import {
  formatAuditTarget,
  formatAuditValue,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import {
  getMonthStartInAppTimeZone,
  parseDateOnlyInAppTimeZone,
} from "@/lib/date-time";
import { generateTransactionNo } from "@/lib/transactions/transactions"; 

export const dynamic = "force-dynamic";

function getChargeMonthFromRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  return getChargeMonthFromMonthValue(searchParams.get("chargeMonth"));
}

function getChargeMonthFromMonthValue(monthValue: unknown) {
  const monthParam = typeof monthValue === "string" ? monthValue : null;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const parsedMonth = parseDateOnlyInAppTimeZone(`${monthParam}-01`);

    if (parsedMonth) {
      return parsedMonth;
    }
  }

  return getMonthStartInAppTimeZone();
}

export async function GET(request: Request) {
  try {
    const selectedChargeMonth = getChargeMonthFromRequest(request);

    // 1. Fetch all residents with their active units and complete charge history
    const residents = await prisma.resident.findMany({
      // We only want verified residents. You can adjust this 'where' clause 
      // if you need to filter out people who have completely moved out (KELUAR).
      include: {
        arrearsSummary: true, 
        occupancies: {
          where: { status: "CURRENT" },
          include: {
            unit: {
              include: { quarterCategory: true },
            },
          },
        },
        monthlyCharges: {
          where: { chargeMonth: selectedChargeMonth },
          include: {
            additionalCharges: true,
            rebates: true,
          },
        },
      },
    });

    // 2. Map the raw database data into the clean frontend list format
    const tunggakanList = residents.map(mapTunggakanForApi);

    // 3. Calculate Live KPIs
    // A. Jumlah Tunggakan (Live sum of current outstanding debts)
    const jumlahTunggakan = tunggakanList.reduce((sum, item) => sum + item.jumlahTunggakan, 0);

    // B. Jumlah Rekod (Total historical revenue charged across the whole system)
    const historicalDebits = await prisma.transaction.aggregate({
      _sum: {
        debitAmount: true,
      },
      where: {
        status: "NORMAL",
      }
    });
    
    const jumlahRekod = Number(historicalDebits._sum.debitAmount || 0);

    // 4. Return the successful response
    return NextResponse.json({
      ok: true,
      summary: {
        jumlahRekod,
        jumlahTunggakan,
      },
      data: tunggakanList,
    });

  } catch (error) {
    console.error("[API_TUNGGAKAN_GET] Error fetching arrears data:", error);
    
    // Return error message in Malay for the UI to display
    return NextResponse.json(
      { 
        ok: false, 
        message: "Ralat sistem sistem berlaku semasa mengambil senarai tunggakan. Sila cuba sebentar lagi." 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentAdmin = await getCurrentAdmin();
    // 1. Parse and Validate the Input Body
    const body = await request.json();
    const parsedData = parseBulkUpdateBody(body);

    if (!parsedData.ok) {
      return NextResponse.json({ ok: false, message: parsedData.message }, { status: 400 });
    }

    const { residentIds, cajSenggaraEnabled, cajTambahan, rebat } = parsedData.data;
    const chargeMonth = getChargeMonthFromMonthValue(
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).chargeMonth
        : null
    );

    // We assume the admin making this change is logged in. 
    // In your actual app, you would get this from your Auth session.

    // 2. Fetch required reference data for the selected residents
    const residentsInfo = await prisma.resident.findMany({
      where: { id: { in: residentIds } },
      include: {
        occupancies: {
          where: { status: "CURRENT" },
          include: { unit: { include: { quarterCategory: true } } }
        }
      }
    });

    // 3. Execute the complex database update inside a Transaction
    await prisma.$transaction(async (tx) => {
      
      for (const resident of residentsInfo) {
        
        // Find or Create the Monthly Charge record for this month
        let monthlyCharge = await tx.monthlyCharge.findUnique({
          where: { residentId_chargeMonth: { residentId: resident.id, chargeMonth } }
        });

        if (!monthlyCharge) {
            monthlyCharge = await tx.monthlyCharge.create({
                data: {
                    residentId: resident.id,
                    chargeMonth,
                    unitId: resident.occupancies[0]?.unitId || null,
                }
            });
        }

        let totalNewTambahan = 0;
        let totalNewRebat = 0;
        let senggaraChargeToAdd = 0;

        // A. Handle Senggara (Maintenance) Toggle
        if (cajSenggaraEnabled && resident.occupancies.length > 0) {
            const maintenanceRate = Number(resident.occupancies[0].unit.quarterCategory.maintenancePrice);
            
            // Only add if they haven't been charged for maintenance this month yet
            if (Number(monthlyCharge.maintenanceAmount) === 0) {
                senggaraChargeToAdd = maintenanceRate;
                
                // Log Transaction for Senggara
                const txNoSenggara = await generateTransactionNo(tx); // 1. ADD THIS

                await tx.transaction.create({
                    data: {
                        transactionNo: txNoSenggara, // 2. ADD THIS
                        residentId: resident.id,
                        transactionDate: chargeMonth,
                        category: "CAJ_PENYELENGGARAAN",
                        debitAmount: maintenanceRate,
                    }
                });
            }
        }

        // B. Handle Caj Tambahan
        for (const item of cajTambahan) {
            totalNewTambahan += item.amaun;
            
            // 1. Add to AdditionalCharge Table
            await tx.additionalCharge.create({
                data: {
                    monthlyChargeId: monthlyCharge.id,
                    chargeDate: item.tarikh,
                    description: item.catatan,
                    amount: item.amaun,
                }
            });

            // 2. Log Transaction (Debit)
            const txNoTambahan = await generateTransactionNo(tx); // 1. ADD THIS

            await tx.transaction.create({
                data: {
                    transactionNo: txNoTambahan, // 2. ADD THIS
                    residentId: resident.id,
                    transactionDate: chargeMonth,
                    category: "CAJ_TAMBAHAN",
                    description: item.catatan,
                    debitAmount: item.amaun,
                }
            });
        }

        // C. Handle Rebat
        for (const item of rebat) {
            totalNewRebat += item.amaun;
            
            // 1. Add to Rebate Table
            await tx.rebate.create({
                data: {
                    monthlyChargeId: monthlyCharge.id,
                    rebateDate: item.tarikh,
                    description: item.catatan,
                    amount: item.amaun,
                }
            });

            // 2. Log Transaction (Credit)
            const txNoRebat = await generateTransactionNo(tx); // 1. ADD THIS

            await tx.transaction.create({
                data: {
                    transactionNo: txNoRebat, // 2. ADD THIS
                    residentId: resident.id,
                    transactionDate: chargeMonth,
                    category: "REBAT",
                    description: item.catatan,
                    creditAmount: item.amaun,
                }
            });
        }

        // D. Update the MonthlyCharge totals
        await tx.monthlyCharge.update({
            where: { id: monthlyCharge.id },
            data: {
                maintenanceAmount: { increment: senggaraChargeToAdd },
                additionalChargesTotal: { increment: totalNewTambahan },
                rebateTotal: { increment: totalNewRebat },
                totalMonthlyCharge: { increment: senggaraChargeToAdd + totalNewTambahan },
                balanceForMonth: { increment: senggaraChargeToAdd + totalNewTambahan - totalNewRebat },
            }
        });

        // E. Update the Master Arrears Summary (Live Sum)
        // Arrears = Previous Arrears + New Senggara + New Tambahan - New Rebat
        const netChange = senggaraChargeToAdd + totalNewTambahan - totalNewRebat;

        await tx.arrearsSummary.upsert({
            where: { residentId: resident.id },
            create: {
                residentId: resident.id,
                totalArrearsAmount: netChange,
            },
            update: {
                totalArrearsAmount: { increment: netChange }
            }
        });
      }

      const totalTambahan = cajTambahan.reduce((sum, item) => sum + item.amaun, 0);
      const totalRebat = rebat.reduce((sum, item) => sum + item.amaun, 0);

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Tunggakan",
        actionType: "UPDATE",
        target: formatAuditTarget([`${residentIds.length} penghuni`, formatAuditValue(chargeMonth)]),
        entityType: "ARREARS_SUMMARY",
        entityId: null,
        summary: `Mengemaskini caj tunggakan secara pukal untuk ${residentIds.length} penghuni.`,
        details: [
          `Bulan caj: ${formatAuditValue(chargeMonth)}.`,
          `Caj penyelenggaraan: ${cajSenggaraEnabled ? "diaktifkan" : "tidak diaktifkan"}.`,
          `Bilangan caj tambahan: ${cajTambahan.length}, jumlah RM ${totalTambahan.toFixed(2)}.`,
          `Bilangan rebat: ${rebat.length}, jumlah RM ${totalRebat.toFixed(2)}.`,
          `Senarai penghuni terlibat: ${residentsInfo.map((resident) => `${resident.fullName} (${resident.icNumber})`).join(", ")}.`,
        ],
      });
    },
      {
        maxWait: 5000,
        timeout: 20000 
      });

    // 4. Return Success Response
    return NextResponse.json({
        ok: true,
        message: `Maklumat tunggakan berjaya dikemas kini untuk ${residentIds.length} penghuni.`
    });

  } catch (error) {
    console.error("[API_TUNGGAKAN_POST] Error saving bulk update:", error);
    return NextResponse.json(
      { ok: false, message: "Ralat pangkalan data berlaku semasa menyimpan maklumat." },
      { status: 500 }
    );
  }
}
