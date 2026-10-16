export function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function formatPolishDate(value: string) {
  return parseIsoDate(value) ? value.split("-").reverse().join(".") : "";
}

export function parsePolishDate(value: string) {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return null;
  const iso = value.split(".").reverse().join("-");
  return parseIsoDate(iso) ? iso : null;
}

export function warsawDayBoundary(value: string, nextDay = false) {
  const date = parseIsoDate(value);
  if (!date) throw new Error("Nieprawidłowa data.");
  date.setUTCHours(0, 0, 0, 0);
  if (nextDay) date.setUTCDate(date.getUTCDate() + 1);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const offsetSeconds = getPart("hour") * 3600 + getPart("minute") * 60 + getPart("second");
  return new Date(date.getTime() - offsetSeconds * 1000).toISOString();
}

export function getMonthDays(month: Date) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const first = new Date(month);
  first.setUTCDate(1);
  const afterLast = new Date(first);
  afterLast.setUTCMonth(monthIndex + 1);
  afterLast.setUTCDate(0);
  const offset = (first.getUTCDay() + 6) % 7;
  const count = afterLast.getUTCDate();

  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > count) return null;
    return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}
