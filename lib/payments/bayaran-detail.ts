import { prisma } from "@/lib/prisma";
import type {
  BayaranDetail,
  BayaranPaymentHistoryRow,
  BayaranStatusFilter,
} from "@/lib/payments/bayaran-types";

export async function getBayaranPaymentDetail(recordId: string) {
  const details = await getBayaranPaymentDetailsByIds([recordId], {
    includeHistory: true,
  });

  return details[recordId] ?? null;
}

type BayaranDetailOptions = {
  includeHistory?: boolean;
};

export async function getBayaranPaymentDetailsByIds(
  recordIds: string[],
  options: BayaranDetailOptions = {},
) {
  const uniqueRecordIds = Array.from(new Set(recordIds)).filter(Boolean);
  const includeHistory = options.includeHistory ?? true;

  if (uniqueRecordIds.length === 0) {
    return {};
  }

  const paymentRecordRows = await prisma.payment.findMany({
    where: {
      id: {
        in: uniqueRecordIds,
      },
    },
    select: {
      id: true,
      residentId: true,
    },
  });
  const residentIdByRecordId = new Map(
    uniqueRecordIds.map((recordId) => [recordId, recordId]),
  );

  paymentRecordRows.forEach((payment) => {
    residentIdByRecordId.set(payment.id, payment.residentId);
  });

  const residentIds = Array.from(new Set(residentIdByRecordId.values()));
  const residents = await prisma.resident.findMany({
    where: {
      id: {
        in: residentIds,
      },
    },
    select: {
      id: true,
      fullName: true,
      icNumber: true,
      status: true,
      arrearsSummary: {
        select: {
          totalArrearsAmount: true,
        },
      },
      occupancies: {
        where: {
          status: "CURRENT",
        },
        orderBy: {
          moveInDate: "desc",
        },
        take: 1,
        select: {
          moveInDate: true,
          moveOutDate: true,
          unit: {
            select: {
              id: true,
              unitCode: true,
              quarterCategory: {
                select: {
                  id: true,
                  categoryName: true,
                  address: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const residentById = new Map(residents.map((resident) => [resident.id, resident]));
  const currentMonthTotalsPromise = prisma.payment.groupBy({
    by: ["residentId"],
    where: {
      residentId: {
        in: residentIds,
      },
      paymentDate: {
        gte: getCurrentMonthStart(),
        lt: getNextMonthStart(),
      },
    },
    _sum: {
      amount: true,
    },
  });
  const historyRowsPromise = includeHistory
    ? prisma.payment.findMany({
        where: {
          residentId: {
            in: residentIds,
          },
        },
        select: {
          id: true,
          residentId: true,
          paymentDate: true,
          receiptNo: true,
          amount: true,
          description: true,
          transaction: {
            select: {
              transactionNo: true,
            },
          },
        },
        orderBy: [
          {
            paymentDate: "desc",
          },
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
      })
    : Promise.resolve([]);
  const [currentMonthTotals, historyRows] = await Promise.all([
    currentMonthTotalsPromise,
    historyRowsPromise,
  ]);
  const currentMonthTotalByResidentId = new Map(
    currentMonthTotals.map((row) => [
      row.residentId,
      Number(row._sum.amount ?? 0),
    ]),
  );
  const historyByResidentId = new Map<string, BayaranPaymentHistoryRow[]>();

  historyRows.forEach((history) => {
    const residentHistory = historyByResidentId.get(history.residentId) ?? [];

    residentHistory.push({
      id: history.transaction?.transactionNo ?? history.id,
      date: history.paymentDate.toISOString(),
      receiptNo: history.receiptNo,
      description: history.description ?? "Bayaran Diterima",
      amount: Number(history.amount),
    });
    historyByResidentId.set(history.residentId, residentHistory);
  });

  return uniqueRecordIds.reduce<Record<string, BayaranDetail>>((details, recordId) => {
    const residentId = residentIdByRecordId.get(recordId);
    const resident = residentId ? residentById.get(residentId) : null;

    if (!resident) {
      return details;
    }

    const currentOccupancy = resident.occupancies[0] ?? null;
    const arrearsAmount = resident.arrearsSummary
      ? Number(resident.arrearsSummary.totalArrearsAmount)
      : null;
    const isDataTidakLengkap = resident.status === "DATA_TIDAK_LENGKAP";

    details[recordId] = {
      id: recordId,
      resident: {
        id: resident.id,
        name: resident.fullName,
        ic: resident.icNumber,
        age: calculateAgeFromIcNumber(resident.icNumber),
        status: resident.status,
        statusLabel: getResidentStatusLabel(resident.status),
      },
      quarters: {
        categoryId: currentOccupancy?.unit.quarterCategory.id ?? null,
        unitId: currentOccupancy?.unit.id ?? null,
        categoryName:
          currentOccupancy?.unit.quarterCategory.categoryName ?? "N/A",
        unitCode: currentOccupancy?.unit.unitCode ?? "N/A",
        address: currentOccupancy?.unit.quarterCategory.address ?? null,
        moveInDate: currentOccupancy?.moveInDate.toISOString() ?? null,
        moveOutDate: currentOccupancy?.moveOutDate?.toISOString() ?? null,
      },
      payment: {
        amountThisMonth:
          currentMonthTotalByResidentId.get(resident.id) ?? 0,
        arrearsAmount,
        status: getPaymentStatusFilter(arrearsAmount, isDataTidakLengkap),
        statusLabel: getPaymentStatusLabel(arrearsAmount, isDataTidakLengkap),
      },
      historyLoaded: includeHistory,
      history: historyByResidentId.get(resident.id) ?? [],
    };

    return details;
  }, {});
}

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getNextMonthStart() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function getResidentStatusLabel(status: string) {
  if (status === "AKTIF") return "Aktif";
  if (status === "TIDAK_LAYAK") return "Tidak Layak";
  if (status === "PENCEN_MENDATANG") return "Pencen Mendatang";
  if (status === "DATA_TIDAK_LENGKAP") return "Data Tidak Lengkap";

  return status;
}

function getPaymentStatusLabel(
  arrearsAmount: number | null,
  isDataTidakLengkap: boolean,
) {
  if (isDataTidakLengkap) return "Data Tidak Lengkap";

  const currentArrears = arrearsAmount ?? 0;

  if (currentArrears < 0) return "Lebihan Bayaran";
  if (currentArrears > 0) return "Kurang Bayaran";

  return "Cukup Bayaran";
}

function getPaymentStatusFilter(
  arrearsAmount: number | null,
  isDataTidakLengkap: boolean,
): BayaranStatusFilter {
  if (isDataTidakLengkap) return "tidak-lengkap";

  const currentArrears = arrearsAmount ?? 0;

  if (currentArrears < 0) return "lebih";
  if (currentArrears > 0) return "kurang";

  return "cukup";
}

function calculateAgeFromIcNumber(icNumber: string) {
  const compactIcNumber = icNumber.replace(/\D/g, "");

  if (compactIcNumber.length < 6) {
    return null;
  }

  const year = Number(compactIcNumber.slice(0, 2));
  const month = Number(compactIcNumber.slice(2, 4));
  const day = Number(compactIcNumber.slice(4, 6));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const candidateYear = currentCentury + year;
  const fullYear =
    candidateYear > currentYear ? candidateYear - 100 : candidateYear;
  const birthDate = new Date(fullYear, month - 1, day);

  if (
    birthDate.getFullYear() !== fullYear ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
