import { ApplicationError } from "../../shared/domain/application-error";
import { Money } from "./money";
export class Payment {
  readonly amount: Money;
  constructor(
    amount: number,
    readonly method: "PIX" | "CASH" | "CARD",
    readonly installments: number | null,
  ) {
    this.amount = Money.from(amount);
    if (
      !this.amount.cents ||
      !["PIX", "CASH", "CARD"].includes(method) ||
      (installments !== null &&
        (method !== "CARD" ||
          !Number.isInteger(installments) ||
          installments < 1 ||
          installments > 48))
    )
      throw new ApplicationError(
        "Pagamento ou parcelas do cartão inválidos",
        "INVALID_INPUT",
      );
  }
}
