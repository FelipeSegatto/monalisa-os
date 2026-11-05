import { ApplicationError } from "../../shared/domain/application-error";
/** Fixed thousandths, matching DECIMAL(12,3); no floating-point balance arithmetic. */
export class StockBalance {
  static units(value: number): number {
    const n = Math.round(value * 1000);
    if (
      !Number.isFinite(value) ||
      Math.abs(value * 1000 - n) > 0.00001 ||
      Math.abs(n) > 999999999999
    )
      throw new ApplicationError(
        "Quantidade inválida (até três casas decimais)",
        "INVALID_INPUT",
      );
    return n;
  }
  constructor(private readonly current: number) {
    StockBalance.units(current);
  }
  move(type: string, quantity: number): { delta: number; balance: number } {
    const q = StockBalance.units(quantity);
    if (q === 0 || ((type === "IN" || type === "CONSUMPTION") && q < 0))
      throw new ApplicationError(
        "Quantidade deve ser positiva",
        "INVALID_INPUT",
      );
    const delta = type === "CONSUMPTION" ? -q : q;
    const balance = StockBalance.units(this.current) + delta;
    if (balance < 0)
      throw new ApplicationError("Estoque insuficiente", "CONFLICT");
    StockBalance.units(balance / 1000);
    return { delta: delta / 1000, balance: balance / 1000 };
  }
}
