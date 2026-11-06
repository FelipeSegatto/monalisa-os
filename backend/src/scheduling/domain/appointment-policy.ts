/** Regras puras do domínio: independentes de NestJS, Prisma ou HTTP. */
export type Interval = { start: Date; end: Date };
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}
export function validInterval(interval: Interval, maxMinutes = 720): boolean {
  return (
    Number.isFinite(+interval.start) &&
    Number.isFinite(+interval.end) &&
    interval.end > interval.start &&
    +interval.end - +interval.start <= maxMinutes * 60000
  );
}
export function canTransition(previous: string, next: string): boolean {
  if (previous === "COMPLETED" && next !== "COMPLETED") return false;
  if (previous === "CANCELLED" && next !== "CANCELLED") return false;
  return [
    "SCHEDULED",
    "CONFIRMED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW",
  ].includes(next);
}
