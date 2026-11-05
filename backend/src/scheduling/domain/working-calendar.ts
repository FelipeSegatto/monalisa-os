import { ApplicationError } from "../../shared/domain/application-error";
export interface WorkingPeriod {
  weekday: number;
  startMinute: number;
  endMinute: number;
}
/** Clinic operating timezone. No reliance on the host timezone. */
export class WorkingCalendar {
  private readonly periods: WorkingPeriod[];
  constructor(periods: readonly WorkingPeriod[]) {
    this.periods = periods.map((p) => ({ ...p }));
    for (const p of this.periods) {
      if (
        ![p.weekday, p.startMinute, p.endMinute].every(Number.isInteger) ||
        p.weekday < 0 ||
        p.weekday > 6 ||
        p.startMinute < 0 ||
        p.endMinute > 1440 ||
        p.endMinute <= p.startMinute
      )
        throw new ApplicationError("Jornada inválida", "INVALID_INPUT");
    }
    for (let i = 0; i < this.periods.length; i++)
      for (let j = i + 1; j < this.periods.length; j++) {
        const a = this.periods[i],
          b = this.periods[j];
        if (
          a.weekday === b.weekday &&
          a.startMinute < b.endMinute &&
          a.endMinute > b.startMinute
        )
          throw new ApplicationError("Jornadas sobrepostas", "INVALID_INPUT");
      }
  }
  includes(start: Date, end: Date): boolean {
    const parts = (date: Date) => {
      const f = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date);
      const get = (key: string) => f.find((p) => p.type === key)!.value;
      return {
        day: `${get("year")}-${get("month")}-${get("day")}`,
        minute: Number(get("hour")) * 60 + Number(get("minute")),
      };
    };
    const a = parts(start),
      b = parts(end);
    const weekday = new Date(a.day + "T12:00:00Z").getUTCDay();
    return (
      a.day === b.day &&
      this.periods.some(
        (p) =>
          p.weekday === weekday &&
          a.minute >= p.startMinute &&
          b.minute <= p.endMinute,
      )
    );
  }
  snapshot() {
    return this.periods.map((p) => ({ ...p }));
  }
}
