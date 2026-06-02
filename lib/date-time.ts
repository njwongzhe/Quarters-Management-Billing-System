export const APP_TIME_ZONE = "Asia/Kuala_Lumpur";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export function getAppTimeZoneDateParts(date = new Date()): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: getDatePart(parts, "year"),
    month: getDatePart(parts, "month"),
    day: getDatePart(parts, "day"),
  };
}

export function getTodayDateInAppTimeZone() {
  return datePartsToUtcDate(getAppTimeZoneDateParts());
}

export function getMonthStartInAppTimeZone(date = new Date()) {
  const { year, month } = getAppTimeZoneDateParts(date);

  return datePartsToUtcDate({ year, month, day: 1 });
}

export function getMonthEndInAppTimeZone(date = new Date()) {
  const { year, month } = getAppTimeZoneDateParts(date);

  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

export function parseDateOnlyInAppTimeZone(value: string) {
  const parts = parseDateOnlyParts(value);

  return parts ? datePartsToUtcDate(parts) : null;
}

export function parseFlexibleDateOnlyInAppTimeZone(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  const dayFirstMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (dayFirstMatch) {
    return parseDateOnlyInAppTimeZone(
      `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}`,
    );
  }

  return parseDateOnlyInAppTimeZone(normalizedValue.slice(0, 10));
}

export function getDateOnlyRangeInAppTimeZone(value: string) {
  const start = parseDateOnlyInAppTimeZone(value);

  if (!start) {
    return null;
  }

  return {
    start,
    end: new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    ),
  };
}

export function getDateKeyInAppTimeZone(date: Date) {
  const { year, month, day } = getAppTimeZoneDateParts(date);

  return year * 10000 + month * 100 + day;
}

export function getDayOfMonthInAppTimeZone(date: Date) {
  return getAppTimeZoneDateParts(date).day;
}

export function isSameMonthInAppTimeZone(date: Date, monthDate: Date) {
  const dateParts = getAppTimeZoneDateParts(date);
  const monthParts = getAppTimeZoneDateParts(monthDate);

  return dateParts.year === monthParts.year && dateParts.month === monthParts.month;
}

export function formatDatePrefixInAppTimeZone(date = new Date()) {
  const { year, month, day } = getAppTimeZoneDateParts(date);

  return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

function parseDateOnlyParts(value: string): DateParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = datePartsToUtcDate({ year, month, day });

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function datePartsToUtcDate({ year, month, day }: DateParts) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function getDatePart(
  parts: Intl.DateTimeFormatPart[],
  type: "year" | "month" | "day",
) {
  const part = parts.find((item) => item.type === type)?.value;
  if (!part) throw new Error(`Unable to calculate application ${type}.`);
  return Number(part);
}
