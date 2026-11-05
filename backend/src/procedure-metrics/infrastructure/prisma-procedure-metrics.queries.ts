import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import {
  ProcedureMetricsQueries,
  ProcedureActivityMetric,
} from "../application/procedure-metrics.queries";
@Injectable()
export class PrismaProcedureMetricsQueries extends ProcedureMetricsQueries {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async monthly(month: string) {
    const start = new Date(month + "-01T03:00:00Z"),
      previous = new Date(start),
      end = new Date(start);
    previous.setUTCMonth(previous.getUTCMonth() - 1);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const period = (from: Date, to: Date) => ({
      attendance: { status: "COMPLETED", completedAt: { gte: from, lt: to } },
    });
    const [current, last, materials, shots, options] = await Promise.all([
      this.db.procedureExecution.groupBy({
        by: ["procedureId"],
        where: period(start, end),
        _count: { id: true },
      }),
      this.db.procedureExecution.groupBy({
        by: ["procedureId"],
        where: period(previous, start),
        _count: { id: true },
      }),
      this.db.materialUsage.groupBy({
        by: ["executionId", "stockItemId", "materialName", "usage"],
        where: { execution: period(start, end) },
        _count: { id: true },
      }),
      this.db.shotLedgerEntry.findMany({
        where: {
          execution: {
            attendance: {
              status: "COMPLETED",
              completedAt: { gte: previous, lt: end },
            },
          },
        },
        select: {
          quantityDelta: true,
          execution: {
            select: {
              procedureId: true,
              attendance: { select: { completedAt: true } },
            },
          },
        },
      }),
      this.db.procedureExecution.groupBy({
        by: ["procedureId", "variationId"],
        where: { ...period(start, end), variationId: { not: null } },
        _count: { id: true },
      }),
    ]);
    const ids = [...new Set([...current, ...last].map((p) => p.procedureId))];
    const [procedures, executionIds, variations] = await Promise.all([
      this.db.procedure.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      }),
      this.db.procedureExecution.findMany({
        where: { id: { in: materials.map((m) => m.executionId) } },
        select: { id: true, procedureId: true },
      }),
      this.db.procedureVariation.findMany({
        where: { id: { in: options.map((o) => o.variationId!) } },
        select: { id: true, name: true },
      }),
    ]);
    const result: ProcedureActivityMetric[] = procedures.map((p) => ({
      procedureId: p.id,
      procedureName: p.name,
      executions: current.find((c) => c.procedureId === p.id)?._count.id ?? 0,
      previousExecutions:
        last.find((c) => c.procedureId === p.id)?._count.id ?? 0,
      shots: 0,
      previousShots: 0,
      options: [],
      materials: [],
    }));
    for (const s of shots) {
      const p = result.find((p) => p.procedureId === s.execution!.procedureId);
      if (p) {
        if (s.execution!.attendance.completedAt! >= start)
          p.shots += s.quantityDelta;
        else p.previousShots += s.quantityDelta;
      }
    }
    for (const option of options) {
      const p = result.find((p) => p.procedureId === option.procedureId);
      if (p)
        p.options.push({
          variationId: option.variationId!,
          name:
            variations.find((v) => v.id === option.variationId)?.name ??
            String(option.variationId),
          executions: option._count.id,
        });
    }
    for (const m of materials) {
      const p = result.find(
        (p) =>
          p.procedureId ===
          executionIds.find((e) => e.id === m.executionId)?.procedureId,
      );
      if (!p) continue;
      let entry = p.materials.find((s) => s.stockItemId === m.stockItemId);
      if (!entry) {
        entry = {
          stockItemId: m.stockItemId,
          materialName: m.materialName,
          used: 0,
          small: 0,
          notUsed: 0,
        };
        p.materials.push(entry);
      }
      if (m.usage === "USED") entry.used += m._count.id;
      else if (m.usage === "SMALL") entry.small += m._count.id;
      else entry.notUsed += m._count.id;
    }
    return {
      month,
      previousMonth: previous.toISOString().slice(0, 7),
      procedures: result,
    };
  }
}
