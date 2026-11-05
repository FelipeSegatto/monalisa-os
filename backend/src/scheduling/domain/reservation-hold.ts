/** Expired provisional reservations remain historical records but no longer occupy time. */
export function isExpiredReservation(
  status: string,
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return status === "SCHEDULED" && expiresAt != null && expiresAt <= now;
}
