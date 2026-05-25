const BILLING_TIME_ZONE = "Asia/Kuala_Lumpur";

type BillingPeriod = {
  billingMonth: Date;
  billingMonthEnd: Date;
  startDateKey: number;
  endDateKey: number;
  totalDaysInMonth: number;
  label: string;
};

function getTimeZoneDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BILLING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: "year" | "month" | "day") => {
    const part = parts.find((item) => item.type === type)?.value;
    if (!part) throw new Error(`Unable to calculate billing ${type}.`);
    return Number(part);
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

export function getPreviousBillingPeriod(date = new Date()): BillingPeriod {
  const malaysiaDate = getTimeZoneDateParts(date);
  const billingMonth = new Date(Date.UTC(malaysiaDate.year, malaysiaDate.month - 2, 1));
  const billingMonthEnd = new Date(Date.UTC(
    billingMonth.getUTCFullYear(),
    billingMonth.getUTCMonth() + 1,
    0,
    23,
    59,
    59,
    999
  ));

  return {
    billingMonth,
    billingMonthEnd,
    startDateKey: billingMonth.getUTCFullYear() * 10000 + (billingMonth.getUTCMonth() + 1) * 100 + 1,
    endDateKey: billingMonthEnd.getUTCFullYear() * 10000 +
      (billingMonthEnd.getUTCMonth() + 1) * 100 +
      billingMonthEnd.getUTCDate(),
    totalDaysInMonth: billingMonthEnd.getUTCDate(),
    label: new Intl.DateTimeFormat("ms-MY", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(billingMonth),
  };
}

export function isSameBillingMonth(date: Date, billingMonth: Date) {
  const dateParts = getTimeZoneDateParts(date);

  return (
    dateParts.year === billingMonth.getUTCFullYear() &&
    dateParts.month === billingMonth.getUTCMonth() + 1
  );
}

export function getBillingDayOfMonth(date: Date) {
  return getTimeZoneDateParts(date).day;
}

export function getBillingDateKey(date: Date) {
  const dateParts = getTimeZoneDateParts(date);
  return dateParts.year * 10000 + dateParts.month * 100 + dateParts.day;
}
