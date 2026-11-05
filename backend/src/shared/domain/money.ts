import { ApplicationError } from "./application-error";
export class Money {
  private constructor(readonly cents: number) {}
  static from(value: number | string): Money {
    const text = String(value);
    if (!/^\d+(\.\d{1,2})?$/.test(text))
      throw new ApplicationError(
        "Valor monetário inválido; use até duas casas decimais",
        "INVALID_INPUT",
      );
    const [whole, fraction = ""] = text.split(".");
    return Money.ofCents(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
  }
  static ofCents(value: number): Money {
    if (!Number.isSafeInteger(value) || value < 0 || value > 999999999999)
      throw new ApplicationError(
        "Valor monetário fora do limite",
        "INVALID_INPUT",
      );
    return new Money(value);
  }
  get amount() {
    return this.cents / 100;
  }
  times(quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000)
      throw new ApplicationError("Quantidade inválida", "INVALID_INPUT");
    return Money.ofCents(this.cents * quantity);
  }
}
/** Largest remainder allocation, stable on input order; integer arithmetic even for DECIMAL limits. */
export function allocate(amount: number, weights: readonly number[]): number[] {
  Money.ofCents(amount);
  weights.forEach(Money.ofCents);
  const total = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (total === 0n) {
    if (amount !== 0)
      throw new ApplicationError(
        "Não é possível distribuir valor sem base",
        "INVALID_INPUT",
      );
    return weights.map(() => 0);
  }
  const rows = weights.map((weight, index) => {
    const product = BigInt(amount) * BigInt(weight);
    return {
      index,
      value: Number(product / total),
      remainder: product % total,
    };
  });
  let left = amount - rows.reduce((n, r) => n + r.value, 0);
  for (const row of [...rows].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
        ? -1
        : 1,
  )) {
    if (left-- <= 0) break;
    row.value++;
  }
  return rows.map((r) => r.value);
}
