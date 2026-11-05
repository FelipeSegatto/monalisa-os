import { ApplicationError } from "../../shared/domain/application-error";
import { MaterialInput } from "./procedure.types";
import { positiveId } from "./procedure-validation";
/** Expected consumption, not a stock movement or the actual attendance consumption. */
export class MaterialRequirement {
  private constructor(
    readonly stockItemId: number,
    readonly quantity: number,
  ) {
    Object.freeze(this);
  }
  static from(data: MaterialInput): MaterialRequirement {
    positiveId(data.stockItemId);
    if (
      !Number.isFinite(data.quantity) ||
      data.quantity <= 0 ||
      data.quantity > 999999999.999 ||
      Math.abs(data.quantity * 1000 - Math.round(data.quantity * 1000)) >
        0.000001
    )
      throw new ApplicationError(
        "Quantidade prevista deve ser positiva e ter até três casas decimais",
        "INVALID_INPUT",
      );
    return new MaterialRequirement(data.stockItemId, data.quantity);
  }
  snapshot(): MaterialInput {
    return { stockItemId: this.stockItemId, quantity: this.quantity };
  }
}
