/** Days before expiry that count as "near expiry" for dashboard warnings. */
export const NEAR_EXPIRY_DAYS = 30;
export type ExpiryStatus = "EXPIRED" | "NEAR";
interface ExpiryCandidate {
  expiresAt: Date | null;
  reversal: unknown | null;
}
/** Soonest active, non-reversed receipt expiry for an item; null when none or not yet due. */
export function nearestExpiry(
  movements: ExpiryCandidate[],
  todayKey: string,
): { date: string; status: ExpiryStatus } | null {
  const dates = movements
    .filter((m) => m.expiresAt && !m.reversal)
    .map((m) => m.expiresAt!.toISOString().slice(0, 10));
  if (!dates.length) return null;
  const soonest = dates.reduce((a, b) => (a < b ? a : b));
  const diffDays = Math.round(
    (Date.parse(soonest) - Date.parse(todayKey)) / 86400000,
  );
  if (diffDays < 0) return { date: soonest, status: "EXPIRED" };
  if (diffDays <= NEAR_EXPIRY_DAYS) return { date: soonest, status: "NEAR" };
  return null;
}
