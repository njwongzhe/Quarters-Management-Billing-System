import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  parseBulkUpdateBody,
  type BulkUpdateTunggakanResult,
} from "../../../lib/arrears/arrears";
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
import { generateTransactionNos } from "@/lib/transactions/transactions";
import { getArrearsPageData } from "@/lib/arrears/arrears-list";

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

function getFormattedMonthSuffix(date: Date): string {
  const rawMonthName = new Intl.DateTimeFormat("ms-MY", { month: "long", year: "numeric" }).format(date);
  return rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);
}

export async function GET(request: Request) {
  try {
    const selectedChargeMonth = getChargeMonthFromRequest(request);
    const result = await getArrearsPageData(selectedChargeMonth);

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      data: result.data,
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
      select: {
        id: true,
        fullName: true,
        icNumber: true,
        occupancies: {
          where: { status: "CURRENT" },
          take: 1,
          select: {
            unitId: true,
            unit: {
              select: {
                quarterCategory: {
                  select: {
                    maintenancePrice: true,
                  },
                },
              },
            },
          },
        }
      }
    });

    const additionalItems = cajTambahan.map((item) => ({
      ...item,
      chargeMonth: getMonthStartInAppTimeZone(item.tarikh),
    }));
    const rebateItems = rebat.map((item) => ({
      ...item,
      chargeMonth: getMonthStartInAppTimeZone(item.tarikh),
    }));
    const requiredChargeMonths = [
      ...new Map(
        [chargeMonth, ...additionalItems.map((item) => item.chargeMonth), ...rebateItems.map((item) => item.chargeMonth)]
          .map((month) => [month.getTime(), month]),
      ).values(),
    ];

    // 3. Execute the complex database update inside a Transaction
    const result = await prisma.$transaction(async (tx): Promise<BulkUpdateTunggakanResult> => {
      if (residentsInfo.length > 0) {
        await tx.monthlyCharge.createMany({
          data: residentsInfo.flatMap((resident) =>
            requiredChargeMonths.map((requiredMonth) => ({
              residentId: resident.id,
              chargeMonth: requiredMonth,
              unitId: resident.occupancies[0]?.unitId ?? null,
            })),
          ),
          skipDuplicates: true,
        });
      }

      const monthlyCharges = await tx.monthlyCharge.findMany({
        where: {
          residentId: { in: residentsInfo.map((resident) => resident.id) },
          chargeMonth: { in: requiredChargeMonths },
        },
        select: {
          id: true,
          residentId: true,
          chargeMonth: true,
          maintenanceAmount: true,
        },
      });
      const monthlyChargeByResidentMonth = new Map(
        monthlyCharges.map((monthlyCharge) => [
          `${monthlyCharge.residentId}|${monthlyCharge.chargeMonth.getTime()}`,
          monthlyCharge,
        ]),
      );
      const selectedMonthlyChargeByResident = new Map(
        monthlyCharges
          .filter(
            (monthlyCharge) =>
              monthlyCharge.chargeMonth.getTime() === chargeMonth.getTime(),
          )
          .map((monthlyCharge) => [monthlyCharge.residentId, monthlyCharge]),
      );
      const maintenanceResidents = cajSenggaraEnabled
        ? residentsInfo.filter((resident) => {
            const monthlyCharge = selectedMonthlyChargeByResident.get(resident.id);
            return (
              resident.occupancies.length > 0 &&
              monthlyCharge &&
              Number(monthlyCharge.maintenanceAmount) === 0
            );
          })
        : [];
      const maintenanceResidentIds = new Set(
        maintenanceResidents.map((resident) => resident.id),
      );
      const transactionCount =
        maintenanceResidents.length +
        residentsInfo.length * (additionalItems.length + rebateItems.length);
      const transactionNos = await generateTransactionNos(tx, transactionCount);
      let transactionNoIndex = 0;
      const actionDate = new Date();
      const additionalChargeRows: Prisma.AdditionalChargeCreateManyInput[] = [];
      const rebateRows: Prisma.RebateCreateManyInput[] = [];
      const transactionRows: Prisma.TransactionCreateManyInput[] = [];
      const monthlyChargeDeltas = new Map<
        string,
        {
          id: string;
          maintenance: number;
          additional: number;
          rebate: number;
        }
      >();
      const updates: BulkUpdateTunggakanResult["updates"] = [];
      let totalDebitDelta = 0;
      let totalArrearsDelta = 0;

      const addMonthlyDelta = (
        monthlyChargeId: string,
        delta: Partial<{
          maintenance: number;
          additional: number;
          rebate: number;
        }>,
      ) => {
        const current = monthlyChargeDeltas.get(monthlyChargeId) ?? {
          id: monthlyChargeId,
          maintenance: 0,
          additional: 0,
          rebate: 0,
        };
        current.maintenance += delta.maintenance ?? 0;
        current.additional += delta.additional ?? 0;
        current.rebate += delta.rebate ?? 0;
        monthlyChargeDeltas.set(monthlyChargeId, current);
      };

      for (const resident of residentsInfo) {
        const selectedMonthlyCharge = selectedMonthlyChargeByResident.get(resident.id);

        if (!selectedMonthlyCharge) {
          throw new Error(`Rekod caj bulanan untuk ${resident.id} gagal disediakan.`);
        }

        let maintenanceDelta = 0;
        let visibleAdditionalDelta = 0;
        let visibleRebateDelta = 0;
        const shouldAddMaintenance = maintenanceResidentIds.has(resident.id);

        if (shouldAddMaintenance) {
          maintenanceDelta = Number(
            resident.occupancies[0].unit.quarterCategory.maintenancePrice,
          );
          addMonthlyDelta(selectedMonthlyCharge.id, {
            maintenance: maintenanceDelta,
          });
          transactionRows.push({
            transactionNo: transactionNos[transactionNoIndex++],
            residentId: resident.id,
            transactionDate: actionDate,
            chargeMonth,
            category: "CAJ_PENYELENGGARAAN",
            description: `Caj Penyelenggaraan (${getFormattedMonthSuffix(chargeMonth)})`,
            debitAmount: maintenanceDelta,
          });
          totalDebitDelta += maintenanceDelta;
        }

        let residentAdditionalTotal = 0;
        for (const item of additionalItems) {
          const itemMonthlyCharge = monthlyChargeByResidentMonth.get(
            `${resident.id}|${item.chargeMonth.getTime()}`,
          );

          if (!itemMonthlyCharge) {
            throw new Error(`Rekod caj tambahan untuk ${resident.id} gagal disediakan.`);
          }

          additionalChargeRows.push({
            monthlyChargeId: itemMonthlyCharge.id,
            chargeDate: item.tarikh,
            description: item.catatan,
            amount: item.amaun,
          });
          transactionRows.push({
            transactionNo: transactionNos[transactionNoIndex++],
            residentId: resident.id,
            transactionDate: actionDate,
            chargeMonth: item.chargeMonth,
            category: "CAJ_TAMBAHAN",
            description: `${item.catatan} (${getFormattedMonthSuffix(item.chargeMonth)})`,
            debitAmount: item.amaun,
          });
          addMonthlyDelta(itemMonthlyCharge.id, { additional: item.amaun });
          residentAdditionalTotal += item.amaun;
          totalDebitDelta += item.amaun;

          if (item.chargeMonth.getTime() === chargeMonth.getTime()) {
            visibleAdditionalDelta += item.amaun;
          }
        }

        let residentRebateTotal = 0;
        for (const item of rebateItems) {
          const itemMonthlyCharge = monthlyChargeByResidentMonth.get(
            `${resident.id}|${item.chargeMonth.getTime()}`,
          );

          if (!itemMonthlyCharge) {
            throw new Error(`Rekod rebat untuk ${resident.id} gagal disediakan.`);
          }

          rebateRows.push({
            monthlyChargeId: itemMonthlyCharge.id,
            rebateDate: item.tarikh,
            description: item.catatan,
            amount: item.amaun,
          });
          transactionRows.push({
            transactionNo: transactionNos[transactionNoIndex++],
            residentId: resident.id,
            transactionDate: actionDate,
            chargeMonth: item.chargeMonth,
            category: "REBAT",
            description: `${item.catatan} (${getFormattedMonthSuffix(item.chargeMonth)})`,
            creditAmount: item.amaun,
          });
          addMonthlyDelta(itemMonthlyCharge.id, { rebate: item.amaun });
          residentRebateTotal += item.amaun;

          if (item.chargeMonth.getTime() === chargeMonth.getTime()) {
            visibleRebateDelta += item.amaun;
          }
        }

        const jumlahTunggakanDelta =
          maintenanceDelta + residentAdditionalTotal - residentRebateTotal;
        totalArrearsDelta += jumlahTunggakanDelta;
        updates.push({
          residentId: resident.id,
          senggaraDelta: maintenanceDelta,
          tambahanDelta: visibleAdditionalDelta,
          rebatDelta: visibleRebateDelta,
          jumlahTunggakanDelta,
        });
      }

      if (additionalChargeRows.length > 0) {
        await tx.additionalCharge.createMany({ data: additionalChargeRows });
      }

      if (rebateRows.length > 0) {
        await tx.rebate.createMany({ data: rebateRows });
      }

      if (transactionRows.length > 0) {
        await tx.transaction.createMany({ data: transactionRows });
      }

      const monthlyDeltas = [...monthlyChargeDeltas.values()];
      if (monthlyDeltas.length > 0) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "MonthlyCharge" AS monthly_charge
          SET
            "maintenanceAmount" = monthly_charge."maintenanceAmount" + changes.maintenance,
            "additionalChargesTotal" = monthly_charge."additionalChargesTotal" + changes.additional,
            "rebateTotal" = monthly_charge."rebateTotal" + changes.rebate,
            "totalMonthlyCharge" = monthly_charge."totalMonthlyCharge" + changes.maintenance + changes.additional,
            "balanceForMonth" = monthly_charge."balanceForMonth" + changes.maintenance + changes.additional - changes.rebate,
            "updatedAt" = now()
          FROM (
            VALUES ${Prisma.join(
              monthlyDeltas.map(
                (delta) =>
                  Prisma.sql`(${delta.id}::uuid, ${delta.maintenance}::numeric, ${delta.additional}::numeric, ${delta.rebate}::numeric)`,
              ),
            )}
          ) AS changes(id, maintenance, additional, rebate)
          WHERE monthly_charge.id = changes.id
        `);
      }

      if (updates.length > 0) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "ArrearsSummary" (
            "id",
            "residentId",
            "totalArrearsAmount",
            "createdAt",
            "updatedAt"
          )
          VALUES ${Prisma.join(
            updates.map(
              (update) =>
                Prisma.sql`(${randomUUID()}::uuid, ${update.residentId}::uuid, ${update.jumlahTunggakanDelta}::numeric, now(), now())`,
            ),
          )}
          ON CONFLICT ("residentId") DO UPDATE SET
            "totalArrearsAmount" = "ArrearsSummary"."totalArrearsAmount" + EXCLUDED."totalArrearsAmount",
            "updatedAt" = now()
        `);
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

      return {
        updates,
        summaryDelta: {
          jumlahKutipan: totalDebitDelta,
          jumlahTunggakan: totalArrearsDelta,
        },
      };
    },
      {
        maxWait: 5000,
        timeout: 20000 
      });

    // 4. Return Success Response
    return NextResponse.json({
        ok: true,
        message: `Maklumat tunggakan berjaya dikemas kini untuk ${residentIds.length} penghuni.`,
        data: result,
    });

  } catch (error) {
    console.error("[API_TUNGGAKAN_POST] Error saving bulk update:", error);
    return NextResponse.json(
      { ok: false, message: "Ralat pangkalan data berlaku semasa menyimpan maklumat." },
      { status: 500 }
    );
  }
}
