import { ApplicationError } from "../../shared/domain/application-error";
import { Money } from "./money";
import { validDay } from "./commercial-offer";
export class ReceivableSchedule {
  private constructor(
    private readonly rows: { number: number; amount: number; dueOn: string }[],
  ) {}
  static forBalance(
    balance: number,
    input: { amount: number; dueOn: string }[] | undefined,
    defaultDay: string,
  ) {
    const plan = input?.length
      ? input
      : balance
        ? [{ amount: balance / 100, dueOn: defaultDay }]
        : [];
    if (
      plan.length > 120 ||
      plan.some(
        (r) => !validDay(r.dueOn) || Money.from(r.amount).cents === 0,
      ) ||
      plan.reduce((n, r) => n + Money.from(r.amount).cents, 0) !== balance
    )
      throw new ApplicationError(
        "Parcelas devem somar exatamente o saldo após a entrada",
        "INVALID_INPUT",
      );
    return new ReceivableSchedule(
      plan.map((r, n) => ({ ...r, number: n + 1 })),
    );
  }
  snapshot() {
    return this.rows.map((r) => ({ ...r }));
  }
}
