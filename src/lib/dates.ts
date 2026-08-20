/**
 * Date formatting for a Persian-language audience.
 *
 * Publication dates are stored as UTC instants and displayed in the Iranian
 * calendar, because that is the calendar the client and their readers use.
 * `Intl` does the conversion — no hand-rolled Jalali arithmetic lives here.
 */

const PERSIAN_DATE = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Tehran",
});

const PERSIAN_MONTH_YEAR = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  timeZone: "Asia/Tehran",
});

function toDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `۲۹ مرداد ۱۴۰۵` */
export function formatPersianDate(value: Date | string): string {
  const date = toDate(value);
  return date ? PERSIAN_DATE.format(date) : "";
}

/** `مرداد ۱۴۰۵` — for a publication month, where the day adds nothing. */
export function formatPersianMonthYear(value: Date | string): string {
  const date = toDate(value);
  return date ? PERSIAN_MONTH_YEAR.format(date) : "";
}

/** `2026-08-20` — the value an `<input type="date">` expects. */
export function toDateInputValue(value: Date | string): string {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

export const SEASON_LABELS: Record<string, string> = {
  SPRING: "بهار",
  SUMMER: "تابستان",
  AUTUMN: "پاییز",
  WINTER: "زمستان",
};

export function seasonLabel(season: string | null): string {
  return season ? SEASON_LABELS[season] ?? season : "";
}
