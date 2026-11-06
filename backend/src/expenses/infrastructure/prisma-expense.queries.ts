import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { required, iso, expenseLabels } from "../../common/util";
import { Actor } from "../../auth/domain/actor";
import { ExpenseListFilters, ExpenseQueries } from "../application/expense.ports";
import { Money, allocate } from "../../shared/domain/money";
import {
  ProcedurePeriodFigures,
  buildComparison,
} from "../domain/expense-performance";
import { viewExpense } from "./expense.mapper";
import { expenseInclude } from "./prisma-expense.repository";
function monthWindow(month: string) {
  const start = new Date(month + "-01T03:00:00Z");
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const previousStart = new Date(start);
  previousStart.setUTCMonth(previousStart.getUTCMonth() - 1);
  return { start, end, previousStart };
}
@Injectable()
export class PrismaExpenseQueries extends ExpenseQueries {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async list(filters: ExpenseListFilters, actor: Actor) {
    if (actor.role === "FUNCIONARIO") return { expenses: [], nextCursor: null };
    const data = await this.db.expense.findMany({
      where: {
        ...(filters.before ? { id: { lt: filters.before } } : {}),
        ...(filters.dueStart || filters.dueEnd
          ? {
              dueDate: {
                ...(filters.dueStart
                  ? { gte: new Date(filters.dueStart + "T00:00:00Z") }
                  : {}),
                ...(filters.dueEnd
                  ? { lte: new Date(filters.dueEnd + "T23:59:59Z") }
                  : {}),
              },
            }
          : {}),
        ...(filters.search
          ? { description: { contains: filters.search } }
          : {}),
      },
      include: expenseInclude,
      orderBy: { id: "desc" },
      take: 51,
    });
    let rows = data.slice(0, 50).map((x) => viewExpense(x));
    if (filters.procedureId)
      rows = rows.filter((r) =>
        r.allocations.some((a: any) => a.procedureId === filters.procedureId),
      );
    if (filters.destination)
      rows = rows.filter((r) => r.destination === filters.destination);
    return {
      expenses: rows,
      nextCursor: data.length > 50 ? data[49].id : null,
    };
  }
  /** Flat, backward-compatible shape for the previous Financeiro expense list/movements widgets. */
  async records(actor: Actor) {
    if (actor.role === "FUNCIONARIO") return { expenses: [] };
    const data = await this.db.expense.findMany({
      orderBy: { dueDate: "desc" },
      take: 200,
    });
    return {
      expenses: data.map((x) => ({
        id: x.id,
        description: x.description,
        category: x.category,
        categoryLabel: expenseLabels[x.category] ?? x.category,
        supplier: x.supplier,
        amount: Number(x.amount),
        dueDate: x.dueDate.toISOString().slice(0, 10),
        paid: x.paid,
        paidAt: iso(x.paidAt),
        method: x.method,
        recurrence: x.recurrence,
        cancelled: x.cancelled,
        createdAt: iso(x.createdAt),
        expenseModel: x.expenseModel,
      })),
    };
  }
  async detail(id: number, actor: Actor) {
    if (actor.role === "FUNCIONARIO")
      throw required(null, "Acesso restrito a administradores");
    const x = required(
      await this.db.expense.findUnique({ where: { id }, include: expenseInclude }),
    );
    return viewExpense(x);
  }
  async performance(month: string, actor: Actor) {
    if (actor.role === "FUNCIONARIO")
      return { month, previousMonth: "", procedures: [] };
    const { start, end, previousStart } = monthWindow(month);
    const previousMonth = previousStart.toISOString().slice(0, 7);
    const [current, previous] = await Promise.all([
      this.periodFigures(start, end),
      this.periodFigures(previousStart, start),
    ]);
    return {
      month,
      previousMonth,
      procedures: buildComparison(current, previous),
    };
  }
  /** Monthly time series (sold/received/expense/result) for the clinic total and each procedure. */
  async series(months: number, actor: Actor) {
    if (actor.role === "FUNCIONARIO") return { months: [], total: null, procedures: [] };
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
    const perMonth = await Promise.all(
      windows.map((w) => this.periodFigures(w.start, w.end)),
    );
    const byProcedure = new Map<
      string,
      { procedureId: number | null; procedureName: string | null }
    >();
    for (const rows of perMonth)
      for (const r of rows)
        if (!byProcedure.has(String(r.procedureId)))
          byProcedure.set(String(r.procedureId), {
            procedureId: r.procedureId,
            procedureName: r.procedureName,
          });
    const seriesFor = (procedureId: number | null) => {
      const sold: number[] = [],
        received: number[] = [],
        expenseAttributed: number[] = [],
        expensePaidNet: number[] = [],
        executions: number[] = [],
        result: number[] = [],
        cashBalance: number[] = [];
      for (const rows of perMonth) {
        const r = rows.find((x) => x.procedureId === procedureId);
        sold.push((r?.soldCents ?? 0) / 100);
        received.push((r?.receivedCents ?? 0) / 100);
        expenseAttributed.push((r?.expenseAttributedCents ?? 0) / 100);
        expensePaidNet.push((r?.expensePaidNetCents ?? 0) / 100);
        executions.push(r?.executions ?? 0);
        result.push(((r?.soldCents ?? 0) - (r?.expenseAttributedCents ?? 0)) / 100);
        cashBalance.push(
          ((r?.receivedCents ?? 0) - (r?.expensePaidNetCents ?? 0)) / 100,
        );
      }
      return { sold, received, expenseAttributed, expensePaidNet, executions, result, cashBalance };
    };
    const totalSeries = (() => {
      const sold: number[] = [],
        received: number[] = [],
        expenseAttributed: number[] = [],
        expensePaidNet: number[] = [],
        result: number[] = [],
        cashBalance: number[] = [];
      for (const rows of perMonth) {
        const s = rows.reduce((n, r) => n + r.soldCents, 0),
          rec = rows.reduce((n, r) => n + r.receivedCents, 0),
          ea = rows.reduce((n, r) => n + r.expenseAttributedCents, 0),
          epn = rows.reduce((n, r) => n + r.expensePaidNetCents, 0);
        sold.push(s / 100);
        received.push(rec / 100);
        expenseAttributed.push(ea / 100);
        expensePaidNet.push(epn / 100);
        result.push((s - ea) / 100);
        cashBalance.push((rec - epn) / 100);
      }
      return { sold, received, expenseAttributed, expensePaidNet, result, cashBalance };
    })();
    return {
      months: windows.map((w) => w.key),
      total: totalSeries,
      procedures: [...byProcedure.values()].map((p) => ({
        procedureId: p.procedureId,
        procedureName: p.procedureName,
        ...seriesFor(p.procedureId),
      })),
    };
  }
  private async periodFigures(
    start: Date,
    end: Date,
  ): Promise<ProcedurePeriodFigures[]> {
    const byProcedure = new Map<string, ProcedurePeriodFigures>();
    const bucket = (procedureId: number | null, procedureName: string | null) => {
      const key = String(procedureId);
      let row = byProcedure.get(key);
      if (!row) {
        row = {
          procedureId,
          procedureName,
          soldCents: 0,
          receivedCents: 0,
          expenseAttributedCents: 0,
          expensePaidNetCents: 0,
          executions: 0,
        };
        byProcedure.set(key, row);
      }
      return row;
    };
    // Sold: items of sales created within the period, by net (or final) value.
    const sales = await this.db.sale.findMany({
      where: { createdAt: { gte: start, lt: end }, cancelled: false },
      include: { items: { include: { procedure: true } } },
    });
    for (const sale of sales)
      for (const item of sale.items) {
        const cents =
          item.netAmount != null
            ? Money.from(item.netAmount.toString()).cents
            : Money.from(item.finalPrice.toString()).cents;
        bucket(item.procedureId, item.procedure.name).soldCents += cents;
      }
    // Received: payments confirmed within the period, apportioned across the sale's items by net weight.
    const payments = await this.db.salePayment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      include: {
        reversal: true,
        sale: { include: { items: { include: { procedure: true } } } },
      },
    });
    for (const payment of payments) {
      if (payment.reversal) continue;
      const items = payment.sale.items;
      const weights = items.map((i) =>
        i.netAmount != null
          ? Money.from(i.netAmount.toString()).cents
          : Money.from(i.finalPrice.toString()).cents,
      );
      if (!weights.reduce((a, b) => a + b, 0)) continue;
      const shares = allocate(Money.from(payment.amount.toString()).cents, weights);
      items.forEach((item, index) => {
        bucket(item.procedureId, item.procedure.name).receivedCents +=
          shares[index];
      });
    }
    // Executions: completed procedure executions within the period.
    const executions = await this.db.procedureExecution.groupBy({
      by: ["procedureId"],
      where: { attendance: { status: "COMPLETED", completedAt: { gte: start, lt: end } } },
      _count: { id: true },
    });
    const procedureIdsForExecutions = executions.map((e) => e.procedureId);
    const procedureNames =
      procedureIdsForExecutions.length
        ? await this.db.procedure.findMany({
            where: { id: { in: procedureIdsForExecutions } },
            select: { id: true, name: true },
          })
        : [];
    for (const row of executions)
      bucket(
        row.procedureId,
        procedureNames.find((p) => p.id === row.procedureId)?.name ?? null,
      ).executions += row._count.id;
    // Expense attributed: current revision's allocations for expenses whose competence falls in the period's month.
    const monthKey = start.toISOString().slice(0, 7);
    const attributedRevisions = await this.db.expenseRevision.findMany({
      where: {
        competenceMonth: monthKey,
        expense: { allocationRevision: { not: 0 }, cancelled: false },
      },
      include: { allocations: true },
    });
    const currentRevisionIds = new Map<number, number>();
    for (const rev of attributedRevisions) {
      const prevBest = currentRevisionIds.get(rev.expenseId);
      if (prevBest === undefined || rev.version > prevBest)
        currentRevisionIds.set(rev.expenseId, rev.version);
    }
    for (const rev of attributedRevisions) {
      if (currentRevisionIds.get(rev.expenseId) !== rev.version) continue;
      for (const allocation of rev.allocations)
        bucket(allocation.procedureId, allocation.procedureName).expenseAttributedCents +=
          Money.from(allocation.amount.toString()).cents;
    }
    // Expense paid net of reversals: cash events within the period, apportioned by the expense's current allocation shares.
    const expensePayments = await this.db.expensePayment.findMany({
      where: { occurredAt: { gte: start, lt: end } },
      include: {
        expense: {
          include: {
            revisions: {
              orderBy: { version: "desc" },
              take: 1,
              include: { allocations: true },
            },
          },
        },
      },
    });
    for (const payment of expensePayments) {
      const signedCents =
        Money.from(payment.amount.toString()).cents *
        (payment.type === "REVERSAL" ? -1 : 1);
      const allocations = payment.expense.revisions[0]?.allocations ?? [];
      if (!allocations.length) {
        bucket(null, null).expensePaidNetCents += signedCents;
        continue;
      }
      const totalAllocated = allocations.reduce(
        (n, a) => n + Money.from(a.amount.toString()).cents,
        0,
      );
      if (!totalAllocated) {
        bucket(null, null).expensePaidNetCents += signedCents;
        continue;
      }
      const shares = allocate(
        Math.abs(signedCents),
        allocations.map((a) => Money.from(a.amount.toString()).cents),
      );
      allocations.forEach((a, index) => {
        bucket(a.procedureId, a.procedureName).expensePaidNetCents +=
          shares[index] * (signedCents < 0 ? -1 : 1);
      });
    }
    return [...byProcedure.values()];
  }
}
