/** Calendar dates, independent of server timezone and daylight-saving changes. */
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function addCalendarMonths(value: string, months: number): string {
  if (
    !validDate(value) ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 120
  )
    throw new Error("Data ou intervalo inválido");
  const day = Number(value.slice(8, 10));
  const first = new Date(value);
  first.setUTCDate(1);
  first.setUTCMonth(first.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}
export function maintenanceState(
  status: string,
  next: string | null,
  today: string,
): "UNKNOWN" | "OVERDUE" | "DUE_SOON" | "OK" | "NOT_APPLICABLE" {
  if (status === "RETIRED") return "NOT_APPLICABLE";
  if (!next) return "UNKNOWN";
  if (next < today) return "OVERDUE";
  const days = (Date.parse(next) - Date.parse(today)) / 86400000;
  return days <= 30 ? "DUE_SOON" : "OK";
}
