import { mapTunggakanForApi, type TunggakanSummary } from "@/lib/arrears/arrears";
import { prisma } from "@/lib/prisma";

export async function getArrearsPageData(selectedChargeMonth: Date) {
  const [residents, historicalDebits] = await Promise.all([
    prisma.resident.findMany({
      include: {
        arrearsSummary: true,
        occupancies: {
          where: {
            status: "CURRENT",
          },
          include: {
            unit: {
              include: {
                quarterCategory: true,
              },
            },
          },
        },
        monthlyCharges: {
          where: {
            chargeMonth: selectedChargeMonth,
          },
          include: {
            additionalCharges: true,
            rebates: true,
          },
        },
      },
    }),
    prisma.transaction.aggregate({
      _sum: {
        debitAmount: true,
      },
      where: {
        status: "NORMAL",
      },
    }),
  ]);

  const data = residents.map(mapTunggakanForApi);
  const summary: TunggakanSummary = {
    jumlahRekod: Number(historicalDebits._sum.debitAmount || 0),
    jumlahKutipan: Number(historicalDebits._sum.debitAmount || 0),
    jumlahTunggakan: data.reduce(
      (sum, item) => sum + item.jumlahTunggakan,
      0,
    ),
  };

  return {
    data,
    summary,
  };
}
