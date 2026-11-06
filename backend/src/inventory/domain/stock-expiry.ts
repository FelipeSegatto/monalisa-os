import { ApplicationError } from "../../shared/domain/application-error";
/** Days before expiry that count as "near expiry" for dashboard warnings. */
export const NEAR_EXPIRY_DAYS = 30;
export type ExpiryStatus = "EXPIRED" | "NEAR";
interface ExpiryCandidate {
  type?: string;
  expiresAt: Date | null;
  reversal: unknown | null;
}
/** Earliest non-reversed receipt requiring a physical check. This is not a remaining-lot balance. */
export function nearestExpiry(
  movements: ExpiryCandidate[] | undefined,
  todayKey: string,
): { date: string; status: ExpiryStatus } | null {
  const dates = (movements ?? [])
    .filter((m) => (!m.type || m.type === "IN") && m.expiresAt && !m.reversal)
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

/** DATE value: validate a real civil day without relying on Date normalization. */
export function stockExpiryDate(value: string): Date {
  const date = new Date(value + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(+date) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new ApplicationError("Data de validade inválida", "INVALID_INPUT");
  return date;
}
