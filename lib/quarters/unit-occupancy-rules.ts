import type { Prisma, ResidentStatus } from "@prisma/client";

import {
  getBillingDateKey,
  getBillingDayOfMonth,
} from "@/lib/billing/billing-period";
import {
  getMonthEndInAppTimeZone,
  getMonthStartInAppTimeZone,
} from "@/lib/date-time";
import { generateTransactionNos } from "@/lib/transactions/transactions";

import {
  getTodayStartInMalaysia,
  resolveQuarterUnitOccupancyState,
} from "./quarter-units";

const OPEN_ENDED_DATE = new Date("9999-12-31T23:59:59.999Z");

type UnitOccupancyPeriodValidationInput = {
  unitId: string;
  moveInDate: Date;
  moveOutDate: Date | null;
  excludedOccupancyId?: string | null;
};

export type UnitOccupancyPeriodValidationResult =
  | {
      ok: true;
      nextMoveInDate: Date | null;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

export async function validateUnitOccupancyPeriod(
  tx: Prisma.TransactionClient,
  input: UnitOccupancyPeriodValidationInput,
): Promise<UnitOccupancyPeriodValidationResult> {
  if (
    input.moveOutDate &&
    input.moveOutDate.getTime() <= input.moveInDate.getTime()
  ) {
    return {
      ok: false,
      status: 400,
      message: "Tarikh keluar mesti selepas tarikh masuk.",
    };
  }

  const otherOccupancies = await tx.unitOccupancy.findMany({
    where: {
      unitId: input.unitId,
      ...(input.excludedOccupancyId
        ? {
            NOT: {
              id: input.excludedOccupancyId,
            },
          }
        : {}),
    },
    orderBy: {
      moveInDate: "asc",
    },
    select: {
      id: true,
      moveInDate: true,
      moveOutDate: true,
    },
  });

  const conflictingOccupancy = otherOccupancies.find((occupancy) =>
    dateRangesOverlap(
      occupancy.moveInDate,
      occupancy.moveOutDate,
      input.moveInDate,
      input.moveOutDate,
    ),
  );

  if (conflictingOccupancy) {
    return {
      ok: false,
      status: 409,
      message:
        "Julat tarikh penghunian bertindih dengan rekod penghunian sedia ada untuk unit ini.",
    };
  }

  const nextOccupancy = otherOccupancies.find(
    (occupancy) => occupancy.moveInDate.getTime() > input.moveInDate.getTime(),
  );

  if (nextOccupancy && !input.moveOutDate) {
    return {
      ok: false,
      status: 400,
      message:
        "Tarikh keluar wajib diisi kerana terdapat rekod penghunian lain selepas tarikh masuk ini.",
    };
  }

  if (
    nextOccupancy &&
    input.moveOutDate &&
    input.moveOutDate.getTime() >= nextOccupancy.moveInDate.getTime()
  ) {
    return {
      ok: false,
      status: 409,
      message:
        "Tarikh keluar mesti sebelum tarikh masuk rekod penghunian seterusnya untuk unit ini.",
    };
  }

  return {
    ok: true,
    nextMoveInDate: nextOccupancy?.moveInDate ?? null,
  };
}

export async function syncQuarterUnitStatuses(
  tx: Prisma.TransactionClient,
  unitIds: string[],
) {
  const uniqueUnitIds = [...new Set(unitIds)].filter(Boolean);

  if (uniqueUnitIds.length === 0) {
    return;
  }

  const referenceDate = getTodayStartInMalaysia();

  for (const unitId of uniqueUnitIds) {
    const occupancies = await tx.unitOccupancy.findMany({
      where: {
        unitId,
      },
      select: {
        id: true,
        moveInDate: true,
        moveOutDate: true,
      },
    });

    let unitStatus: "OCCUPIED" | "VACANT" = "VACANT";

    for (const occupancy of occupancies) {
      const state = resolveQuarterUnitOccupancyState({
        moveInDate: occupancy.moveInDate,
        moveOutDate: occupancy.moveOutDate,
        referenceDate,
      });

      if (state.unitStatus === "OCCUPIED") {
        unitStatus = "OCCUPIED";
      }

      await tx.unitOccupancy.update({
        where: {
          id: occupancy.id,
        },
        data: {
          status: state.occupancyStatus,
        },
      });
    }

    await tx.unit.update({
      where: {
        id: unitId,
      },
      data: {
        status: unitStatus,
      },
    });
  }
}

type OccupancyBillingSnapshot = {
  id: string;
  residentId: string;
  unitId: string;
  moveInDate: Date;
  moveOutDate: Date | null;
  resident: {
    fullName: string;
    icNumber: string;
    status: ResidentStatus;
  };
  unit: {
    unitCode: string;
    quarterCategory: {
      categoryName: string;
      rentalPrice: Prisma.Decimal | number | string;
      penaltyPrice: Prisma.Decimal | number | string;
    };
  };
};

type NextOccupancyBillingPeriod = {
  residentId: string;
  unitId: string;
  moveInDate: Date;
  moveOutDate: Date | null;
  residentStatus: ResidentStatus;
  rentalPrice: number;
  penaltyPrice: number;
};

export type OccupancyProrationPeriod = {
  moveInDate: Date;
  moveOutDate: Date | null;
};

export type OccupancyProrationResult = {
  daysStayed: number;
  totalDaysInMonth: number;
  ratio: number;
};

type ChargeAdjustmentCategory = "CAJ_SEWA" | "CAJ_PENALTI";

type OriginalChargeTransaction = {
  id: string;
  debitAmount: Prisma.Decimal | number | string;
  creditAmount: Prisma.Decimal | number | string;
  childTransactions: {
    debitAmount: Prisma.Decimal | number | string;
    creditAmount: Prisma.Decimal | number | string;
  }[];
};

type OccupancyBillingDelta = {
  category: ChargeAdjustmentCategory;
  baseAmount: number;
  currentAmount: number;
  expectedAmount: number;
  daysStayed: number;
  totalDaysInMonth: number;
  monthlyChargeId: string;
  chargeMonth: Date;
  originalTransactionId: string;
};

export async function createOccupancyBillingAdjustments(
  tx: Prisma.TransactionClient,
  previous: OccupancyBillingSnapshot,
  next: NextOccupancyBillingPeriod | null,
) {
  const affectedMonths = getAffectedChargeMonths(previous, next);

  if (affectedMonths.length === 0) {
    return 0;
  }

  const monthlyCharges = await tx.monthlyCharge.findMany({
    where: {
      residentId: previous.residentId,
      unitId: previous.unitId,
      chargeMonth: {
        in: affectedMonths,
      },
      OR: [
        {
          rentalAmount: {
            gt: 0,
          },
        },
        {
          penaltyAmount: {
            gt: 0,
          },
        },
      ],
    },
    orderBy: {
      chargeMonth: "asc",
    },
  });

  const deltas: OccupancyBillingDelta[] = [];

  for (const charge of monthlyCharges) {
    const rentalOriginalTransaction = await findOriginalChargeTransaction(tx, {
      residentId: previous.residentId,
      chargeMonth: charge.chargeMonth,
      category: "CAJ_SEWA",
    });
    const penaltyOriginalTransaction = await findOriginalChargeTransaction(tx, {
      residentId: previous.residentId,
      chargeMonth: charge.chargeMonth,
      category: "CAJ_PENALTI",
    });

    if (rentalOriginalTransaction) {
      const rentalBaseAmount = getTransactionOriginalChargeAmount(
        rentalOriginalTransaction,
      );
      const currentRental = getTransactionCurrentNetAmount(
        rentalOriginalTransaction,
      );
      const rentalCalculation = next
        ? calculateExpectedChargeForMonth(
            charge.chargeMonth,
            next,
            rentalBaseAmount,
          )
        : createEmptyChargeCalculation(charge.chargeMonth);
      const rentalDelta = {
        category: "CAJ_SEWA" as const,
        baseAmount: rentalBaseAmount,
        currentAmount: currentRental,
        expectedAmount: rentalCalculation.amount,
        daysStayed: rentalCalculation.daysStayed,
        totalDaysInMonth: rentalCalculation.totalDaysInMonth,
        monthlyChargeId: charge.id,
        chargeMonth: charge.chargeMonth,
        originalTransactionId: rentalOriginalTransaction.id,
      };

      if (roundCurrency(rentalDelta.expectedAmount - rentalDelta.currentAmount) !== 0) {
        deltas.push(rentalDelta);
      }
    }

    if (penaltyOriginalTransaction) {
      const penaltyBaseAmount = getTransactionOriginalChargeAmount(
        penaltyOriginalTransaction,
      );
      const currentPenalty = getTransactionCurrentNetAmount(
        penaltyOriginalTransaction,
      );
      const penaltyCalculation =
        next && next.residentStatus === "TIDAK_LAYAK"
          ? calculateExpectedChargeForMonth(
              charge.chargeMonth,
              next,
              penaltyBaseAmount,
            )
          : createEmptyChargeCalculation(charge.chargeMonth);
      const penaltyDelta = {
        category: "CAJ_PENALTI" as const,
        baseAmount: penaltyBaseAmount,
        currentAmount: currentPenalty,
        expectedAmount: penaltyCalculation.amount,
        daysStayed: penaltyCalculation.daysStayed,
        totalDaysInMonth: penaltyCalculation.totalDaysInMonth,
        monthlyChargeId: charge.id,
        chargeMonth: charge.chargeMonth,
        originalTransactionId: penaltyOriginalTransaction.id,
      };

      if (roundCurrency(penaltyDelta.expectedAmount - penaltyDelta.currentAmount) !== 0) {
        deltas.push(penaltyDelta);
      }
    }
  }

  if (deltas.length === 0) {
    return 0;
  }

  const transactionNos = await generateTransactionNos(tx, deltas.length);
  let transactionNoIndex = 0;

  for (const delta of deltas) {
    const deltaAmount = roundCurrency(delta.expectedAmount - delta.currentAmount);

    await tx.transaction.update({
      where: {
        id: delta.originalTransactionId,
      },
      data: {
        status: "DILARASKAN",
      },
    });

    await tx.transaction.create({
      data: {
        transactionNo: transactionNos[transactionNoIndex++],
        residentId: previous.residentId,
        transactionDate: new Date(),
        chargeMonth: delta.chargeMonth, // Set chargeMonth to align with the monthly charge!
        category: delta.category,
        status: "PELARASAN",
        debitAmount: deltaAmount > 0 ? deltaAmount : 0,
        creditAmount: deltaAmount < 0 ? Math.abs(deltaAmount) : 0,
        relatedTransactionId: delta.originalTransactionId,
        description: buildAdjustmentDescription(previous, delta),
      },
    });

    const monthlyChargeDelta = {
      totalMonthlyCharge: {
        increment: deltaAmount,
      },
      balanceForMonth: {
        increment: deltaAmount,
      },
    };

    if (delta.category === "CAJ_SEWA") {
      await tx.monthlyCharge.update({
        where: {
          id: delta.monthlyChargeId,
        },
        data: {
          rentalAmount: {
            increment: deltaAmount,
          },
          ...monthlyChargeDelta,
        },
      });
    } else {
      await tx.monthlyCharge.update({
        where: {
          id: delta.monthlyChargeId,
        },
        data: {
          penaltyAmount: {
            increment: deltaAmount,
          },
          ...monthlyChargeDelta,
        },
      });
    }

    await tx.arrearsSummary.upsert({
      where: {
        residentId: previous.residentId,
      },
      create: {
        residentId: previous.residentId,
        totalArrearsAmount: deltaAmount,
        lastUpdatedMonth: delta.chargeMonth,
      },
      update: {
        totalArrearsAmount: {
          increment: deltaAmount,
        },
        lastUpdatedMonth: delta.chargeMonth,
      },
    });
  }

  return deltas.length;
}

function dateRangesOverlap(
  leftStart: Date,
  leftEnd: Date | null,
  rightStart: Date,
  rightEnd: Date | null,
) {
  return (
    leftStart.getTime() <= (rightEnd ?? OPEN_ENDED_DATE).getTime() &&
    (leftEnd ?? OPEN_ENDED_DATE).getTime() >= rightStart.getTime()
  );
}

function getAffectedChargeMonths(
  previous: OccupancyBillingSnapshot,
  next: NextOccupancyBillingPeriod | null,
) {
  const monthKeys = new Map<number, Date>();

  for (const date of getChargeMonthsInPeriod(
    previous.moveInDate,
    previous.moveOutDate,
  )) {
    monthKeys.set(date.getTime(), date);
  }

  if (next) {
    for (const date of getChargeMonthsInPeriod(next.moveInDate, next.moveOutDate)) {
      monthKeys.set(date.getTime(), date);
    }
  }

  return Array.from(monthKeys.values()).sort(
    (left, right) => left.getTime() - right.getTime(),
  );
}

function getChargeMonthsInPeriod(moveInDate: Date, moveOutDate: Date | null) {
  const currentMonth = getMonthStartInAppTimeZone(moveInDate);
  const endMonth = getMonthStartInAppTimeZone(moveOutDate ?? new Date());
  const months: Date[] = [];

  while (currentMonth.getTime() <= endMonth.getTime()) {
    months.push(new Date(currentMonth));
    currentMonth.setUTCMonth(currentMonth.getUTCMonth() + 1);
  }

  return months;
}

function calculateExpectedChargeForMonth(
  chargeMonth: Date,
  period: NextOccupancyBillingPeriod,
  monthlyAmount: number,
) {
  const proration = calculateOccupancyProrationForMonth(chargeMonth, period);

  return {
    ...proration,
    amount: roundCurrency(
      (monthlyAmount / proration.totalDaysInMonth) * proration.daysStayed,
    ),
  };
}

export function calculateOccupancyProrationForMonth(
  chargeMonth: Date,
  period: OccupancyProrationPeriod,
): OccupancyProrationResult {
  const monthStartKey = getBillingDateKey(getMonthStartInAppTimeZone(chargeMonth));
  const monthEndKey = getBillingDateKey(getMonthEndInAppTimeZone(chargeMonth));
  const moveInKey = getBillingDateKey(period.moveInDate);
  const moveOutKey = period.moveOutDate
    ? getBillingDateKey(period.moveOutDate)
    : Number.POSITIVE_INFINITY;
  const totalDaysInMonth = getBillingDayOfMonth(
    getMonthEndInAppTimeZone(chargeMonth),
  );

  if (moveInKey > monthEndKey || moveOutKey < monthStartKey) {
    return {
      daysStayed: 0,
      totalDaysInMonth,
      ratio: 0,
    };
  }

  const stayStartKey = Math.max(moveInKey, monthStartKey);
  const stayEndKey = Math.min(moveOutKey, monthEndKey);
  const daysStayed = Math.max(
    0,
    getDayFromDateKey(stayEndKey) - getDayFromDateKey(stayStartKey) + 1,
  );

  return {
    daysStayed,
    totalDaysInMonth,
    ratio: daysStayed / totalDaysInMonth,
  };
}

function createEmptyChargeCalculation(chargeMonth: Date) {
  const totalDaysInMonth = getBillingDayOfMonth(
    getMonthEndInAppTimeZone(chargeMonth),
  );

  return {
    amount: 0,
    daysStayed: 0,
    totalDaysInMonth,
    ratio: 0,
  };
}

async function findOriginalChargeTransaction(
  tx: Prisma.TransactionClient,
  input: {
    residentId: string;
    chargeMonth: Date;
    category: ChargeAdjustmentCategory;
  },
): Promise<OriginalChargeTransaction | null> {
  const monthStart = getMonthStartInAppTimeZone(input.chargeMonth);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

  return tx.transaction.findFirst({
    where: {
      residentId: input.residentId,
      OR: [
        { chargeMonth: monthStart }, // For new data
        {
          chargeMonth: null,         // For legacy data fallback
          transactionDate: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      ],
      category: input.category,
      status: {
        in: ["NORMAL", "DILARASKAN"],
      },
      debitAmount: {
        gt: 0,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      debitAmount: true,
      creditAmount: true,
      childTransactions: {
        where: {
          status: "PELARASAN",
        },
        select: {
          debitAmount: true,
          creditAmount: true,
        },
      },
    },
  });
}

function getTransactionOriginalChargeAmount(transaction: OriginalChargeTransaction) {
  const debitAmount = Number(transaction.debitAmount);
  const creditAmount = Number(transaction.creditAmount);

  return debitAmount > 0 ? debitAmount : creditAmount;
}

function getTransactionCurrentNetAmount(transaction: OriginalChargeTransaction) {
  const debitAmount = Number(transaction.debitAmount);
  const creditAmount = Number(transaction.creditAmount);
  const isDebitOriginal = debitAmount > 0;
  const originalAmount = isDebitOriginal ? debitAmount : creditAmount;
  const pastDebitAmount = transaction.childTransactions.reduce(
    (sum, childTransaction) => sum + Number(childTransaction.debitAmount),
    0,
  );
  const pastCreditAmount = transaction.childTransactions.reduce(
    (sum, childTransaction) => sum + Number(childTransaction.creditAmount),
    0,
  );

  return isDebitOriginal
    ? originalAmount + pastDebitAmount - pastCreditAmount
    : originalAmount + pastCreditAmount - pastDebitAmount;
}

function buildAdjustmentDescription(
  previous: OccupancyBillingSnapshot,
  delta: OccupancyBillingDelta,
) {
  const chargeLabel =
    delta.category === "CAJ_SEWA" ? "caj sewa" : "caj penalti";
  const monthLabel = new Intl.DateTimeFormat("ms-MY", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(delta.chargeMonth);

  return [
    `Pelarasan ${chargeLabel} ${monthLabel} selepas perubahan rekod penghunian unit ${previous.unit.unitCode}.`,
    `Penghuni: ${previous.resident.fullName} (No. KP ${previous.resident.icNumber}).`,
    `Hari tinggal dikira: ${delta.daysStayed}/${delta.totalDaysInMonth} hari.`,
    `Jumlah asas bulanan asal: RM${roundCurrency(delta.baseAmount).toFixed(2)}.`,
    `Jumlah semasa selepas pelarasan terdahulu: RM${roundCurrency(delta.currentAmount).toFixed(2)}.`,
    `Jumlah sepatutnya: RM${roundCurrency(delta.expectedAmount).toFixed(2)}.`,
  ].join(" ");
}

function getDayFromDateKey(dateKey: number) {
  return dateKey % 100;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}
