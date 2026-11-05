import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { Money } from "../../shared/domain/money";
import { CashFlowQueries, CashFlowTotals } from "../application/cash-flow.queries";
/** Effective cash movement: SalePayment.paidAt and ExpensePayment.occurredAt, not creation/due dates. */
@Injectable()
export class PrismaCashFlowQueries extends CashFlowQueries {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async inRange(start: Date, end: Date): Promise<CashFlowTotals> {
    const [payments, expensePayments] = await Promise.all([
      this.db.salePayment.findMany({
        where: { paidAt: { gte: start, lt: end } },
        include: { reversal: true },
      }),
      this.db.expensePayment.findMany({
        where: { occurredAt: { gte: start, lt: end } },
      }),
    ]);
    const received = payments
      .filter((p) => !p.reversal)
      .reduce((n, p) => n + Money.from(p.amount.toString()).cents, 0);
    const expensesPaid = expensePayments.reduce(
      (n, p) =>
        n +
        Money.from(p.amount.toString()).cents * (p.type === "REVERSAL" ? -1 : 1),
      0,
    );
    return {
      received: received / 100,
      expensesPaid: expensesPaid / 100,
      balance: (received - expensesPaid) / 100,
    };
  }
}
