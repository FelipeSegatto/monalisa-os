export interface ProcedurePeriodFigures {
  procedureId: number | null;
  procedureName: string | null;
  soldCents: number;
  receivedCents: number;
  expenseAttributedCents: number;
  expensePaidNetCents: number;
  executions: number;
}
export interface ProcedureComparisonRow {
  procedureId: number | null;
  procedureName: string | null;
  sold: number;
  received: number;
  expenseAttributed: number;
  expensePaidNet: number;
  executions: number;
  periodResult: number;
  cashBalance: number;
  previousSold: number;
  previousExpenseAttributed: number;
  changePercent: number | null;
}
/** Not "lucro real por sessão": periodResult = sold - expenseAttributed; cashBalance = received - expensePaidNet. */
function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}
export function buildComparison(
  current: readonly ProcedurePeriodFigures[],
  previous: readonly ProcedurePeriodFigures[],
): ProcedureComparisonRow[] {
  const key = (p: { procedureId: number | null }) => String(p.procedureId);
  const prevByKey = new Map(previous.map((p) => [key(p), p]));
  return current.map((c) => {
    const prev = prevByKey.get(key(c));
    const soldCents = c.soldCents,
      expenseAttributedCents = c.expenseAttributedCents;
    return {
      procedureId: c.procedureId,
      procedureName: c.procedureName,
      sold: soldCents / 100,
      received: c.receivedCents / 100,
      expenseAttributed: expenseAttributedCents / 100,
      expensePaidNet: c.expensePaidNetCents / 100,
      executions: c.executions,
      periodResult: (soldCents - expenseAttributedCents) / 100,
      cashBalance: (c.receivedCents - c.expensePaidNetCents) / 100,
      previousSold: (prev?.soldCents ?? 0) / 100,
      previousExpenseAttributed: (prev?.expenseAttributedCents ?? 0) / 100,
      changePercent: changePercent(soldCents, prev?.soldCents ?? 0),
    };
  });
}
