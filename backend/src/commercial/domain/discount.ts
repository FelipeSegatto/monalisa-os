import { ApplicationError } from "../../shared/domain/application-error";
import { Money } from "./money";
export interface DiscountInput {
  type: "FIXED" | "PERCENT";
  value: number;
  reason: string;
}
export class Discount {
  static calculate(base: number, input: DiscountInput | undefined) {
    if (!input) return 0;
    if (input.reason.trim().length < 3 || input.reason.trim().length > 1000)
      throw new ApplicationError(
        "Informe o motivo do desconto",
        "INVALID_INPUT",
      );
    const value = Money.from(input.value);
    if (input.type === "PERCENT" && value.cents > 10000)
      throw new ApplicationError("Percentual acima de 100%", "INVALID_INPUT");
    const result =
      input.type === "PERCENT"
        ? Number((BigInt(base) * BigInt(value.cents) + 5000n) / 10000n)
        : value.cents;
    if (result > base)
      throw new ApplicationError(
        "Desconto supera o valor disponível",
        "INVALID_INPUT",
      );
    return result;
  }
}
