import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapTunggakanForApi, parseBulkUpdateBody } from "../../../lib/arrears";
import { createAuditLog } from "@/lib/audit-logs";
import { getCurrentAdmin } from "@/lib/current-admin";

export async function GET() {
  try {
    // 1. Fetch all residents with their active units and complete charge history
    const residents = await prisma.resident.findMany({
      // We only want verified residents. You can adjust this 'where' clause 
      // if you need to filter out people who have completely moved out (KELUAR).
      where: {
        recordStatus: "VERIFIED",
      },
      include: {
        occupancies: {
          where: { status: "CURRENT" },
          include: {
            unit: {
              include: { quarterCategory: true },
            },
          },
        },
        monthlyCharges: {
          where: { recordStatus: "VERIFIED" },
          include: {
            additionalCharges: { where: { recordStatus: "VERIFIED" } },
            rebates: { where: { recordStatus: "VERIFIED" } },
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

    // We assume the admin making this change is logged in. 
    // In your actual app, you would get this from your Auth session.
    //todo
    const adminId = currentAdmin?.profile.id; // Current admin, when the session is available.

    // We use the start of the current month as the charge period for these new additions
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

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
          where: { residentId_chargeMonth: { residentId: resident.id, chargeMonth: currentMonth } }
        });

        if (!monthlyCharge) {
            monthlyCharge = await tx.monthlyCharge.create({
                data: {
                    residentId: resident.id,
                    chargeMonth: currentMonth,
                    unitId: resident.occupancies[0]?.unitId || null,
                    createdById: adminId,
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
                await tx.transaction.create({
                    data: {
                        residentId: resident.id,
                        transactionDate: new Date(),
                        category: "CAJ_PENYELENGGARAAN",
                        debitAmount: maintenanceRate,
                        createdById: adminId,
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
                    chargeDate: new Date(item.tarikh),
                    description: item.catatan,
                    amount: item.amaun,
                }
            });

            // 2. Log Transaction (Debit)
            await tx.transaction.create({
                data: {
                    residentId: resident.id,
                    transactionDate: new Date(item.tarikh),
                    category: "CAJ_TAMBAHAN",
                    description: item.catatan,
                    debitAmount: item.amaun,
                    createdById: adminId,
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
                    rebateDate: new Date(item.tarikh),
                    description: item.catatan,
                    amount: item.amaun,
                }
            });

            // 2. Log Transaction (Credit)
            await tx.transaction.create({
                data: {
                    residentId: resident.id,
                    transactionDate: new Date(item.tarikh),
                    category: "REBAT",
                    description: item.catatan,
                    creditAmount: item.amaun,
                    createdById: adminId,
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
                createdById: adminId,
            },
            update: {
                totalArrearsAmount: { increment: netChange }
            }
        });
      }

      await createAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Tunggakan",
        targetData: `${residentIds.length} penghuni`,
        actionType: "UPDATE",
        description: `Mengemaskini caj tunggakan secara pukal untuk ${residentIds.length} penghuni.`,
      });
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
