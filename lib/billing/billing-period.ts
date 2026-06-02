import {
  APP_TIME_ZONE,
  getAppTimeZoneDateParts,
  getDateKeyInAppTimeZone,
  getDayOfMonthInAppTimeZone,
  getMonthEndInAppTimeZone,
  getMonthStartInAppTimeZone,
  isSameMonthInAppTimeZone,
} from "@/lib/date-time";

type BillingPeriod = {
  billingMonth: Date;
  billingMonthEnd: Date;
  startDateKey: number;
  endDateKey: number;
  totalDaysInMonth: number;
  label: string;
};

export function getPreviousBillingPeriod(date = new Date()): BillingPeriod {
  const malaysiaDate = getAppTimeZoneDateParts(date);
  const previousMonthDate = new Date(
    Date.UTC(malaysiaDate.year, malaysiaDate.month - 2, 1),
  );
  const billingMonth = getMonthStartInAppTimeZone(previousMonthDate);
  const billingMonthEnd = getMonthEndInAppTimeZone(previousMonthDate);

  return {
    billingMonth,
    billingMonthEnd,
    startDateKey: getDateKeyInAppTimeZone(billingMonth),
    endDateKey: getDateKeyInAppTimeZone(billingMonthEnd),
    totalDaysInMonth: getDayOfMonthInAppTimeZone(billingMonthEnd),
    label: new Intl.DateTimeFormat("ms-MY", {
      month: "long",
      year: "numeric",
      timeZone: APP_TIME_ZONE,
    }).format(billingMonth),
  };
}

export function isSameBillingMonth(date: Date, billingMonth: Date) {
  return isSameMonthInAppTimeZone(date, billingMonth);
}

export function getBillingDayOfMonth(date: Date) {
  return getDayOfMonthInAppTimeZone(date);
}

export function getBillingDateKey(date: Date) {
  return getDateKeyInAppTimeZone(date);
}
