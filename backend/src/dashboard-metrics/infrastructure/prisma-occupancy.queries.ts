import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import {
  OccupancyQueries,
  ProfessionalOccupancySeries,
} from "../application/occupancy.queries";
const BOOKED_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW"];
function monthWindows(months: number) {
  const n = Math.max(1, Math.min(24, months));
  const now = new Date();
  const windows: { key: string; start: Date; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 3),
    );
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    windows.push({ key: start.toISOString().slice(0, 7), start, end });
  }
  return windows;
}
/** Days matching each weekday (0=Sunday..6=Saturday) within [start,end). */
function weekdayCounts(start: Date, end: Date): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (
    let d = new Date(start);
    d < end;
    d = new Date(d.getTime() + 86400000)
  )
    counts[d.getUTCDay()]++;
  return counts;
}
@Injectable()
export class PrismaOccupancyQueries extends OccupancyQueries {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async series(months: number) {
    const windows = monthWindows(months);
    const professionals = await this.db.professional.findMany({
      where: { workingPeriods: { some: {} } },
      include: { workingPeriods: true },
      orderBy: { name: "asc" },
    });
    if (!professionals.length)
      return { months: windows.map((w) => w.key), professionals: [] };
    const overallStart = windows[0].start,
      overallEnd = windows[windows.length - 1].end;
    const appointments = await this.db.appointment.findMany({
      where: {
        professionalId: { in: professionals.map((p) => p.id) },
        startsAt: { gte: overallStart, lt: overallEnd },
        status: { in: BOOKED_STATUSES as any },
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    });
    const result: ProfessionalOccupancySeries[] = professionals.map((p) => {
      const availableMinutes: number[] = [],
        bookedMinutes: number[] = [],
        occupancyPercent: (number | null)[] = [];
      for (const w of windows) {
        const counts = weekdayCounts(w.start, w.end);
        const available = p.workingPeriods.reduce(
          (n, period) =>
            n + (period.endMinute - period.startMinute) * counts[period.weekday],
          0,
        );
        const booked = appointments
          .filter(
            (a) =>
              a.professionalId === p.id &&
              a.startsAt >= w.start &&
              a.startsAt < w.end,
          )
          .reduce(
            (n, a) => n + (a.endsAt.getTime() - a.startsAt.getTime()) / 60000,
            0,
          );
        availableMinutes.push(available);
        bookedMinutes.push(Math.round(booked));
        occupancyPercent.push(
          available > 0 ? Math.round((booked / available) * 1000) / 10 : null,
        );
      }
      return {
        professionalId: p.id,
        name: p.name,
        color: p.color,
        availableMinutes,
        bookedMinutes,
        occupancyPercent,
      };
    });
    return { months: windows.map((w) => w.key), professionals: result };
  }
}
