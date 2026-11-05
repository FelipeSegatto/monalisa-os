import { ApplicationError } from "../../shared/domain/application-error";
/** Total consumed, including immutable opening/correction entries. */
export class ShotCounter {
  constructor(
    readonly consumed: number,
    readonly capacity: number | null,
  ) {}
  apply(delta: number): number {
    const next = this.consumed + delta;
    if (
      !Number.isSafeInteger(delta) ||
      delta === 0 ||
      Math.abs(delta) > 2147483647 ||
      !Number.isSafeInteger(next) ||
      next < 0
    )
      throw new ApplicationError(
        "Movimentação de disparos inválida",
        "CONFLICT",
      );
    if (this.capacity !== null && next > this.capacity)
      throw new ApplicationError(
        "Capacidade do cartucho insuficiente",
        "CONFLICT",
      );
    return next;
  }
}
