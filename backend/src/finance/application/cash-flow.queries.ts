export interface CashFlowTotals {
  received: number;
  expensesPaid: number;
  balance: number;
}
export abstract class CashFlowQueries {
  abstract inRange(start: Date, end: Date): Promise<CashFlowTotals>;
}
