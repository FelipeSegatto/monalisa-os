import { ApplicationError } from "../../shared/domain/application-error";
export class SessionEntitlement {
  constructor(
    readonly quantity: number,
    readonly used: number,
    readonly reserved: number,
    readonly expiresAt: Date | null,
  ) {}
  assertAvailable(input: {
    customerId: number;
    ownerId: number;
    procedureId: number;
    expectedProcedureId: number;
    variationId: number | null;
    expectedVariationId: number | null;
    at: Date;
    cancelled: boolean;
    paymentAllowed: boolean;
  }) {
    if (
      input.customerId !== input.ownerId ||
      input.procedureId !== input.expectedProcedureId ||
      input.variationId !== input.expectedVariationId
    )
      throw new ApplicationError(
        "Sessão não corresponde ao cliente, procedimento ou área",
        "CONFLICT",
      );
    if (input.cancelled || !input.paymentAllowed)
      throw new ApplicationError(
        "Venda cancelada ou pagamento necessário para utilizar sessões",
        "CONFLICT",
      );
    if (this.expiresAt && this.expiresAt <= input.at)
      throw new ApplicationError(
        "Prazo de utilização das sessões encerrado",
        "CONFLICT",
      );
    if (this.quantity - this.used - this.reserved < 1)
      throw new ApplicationError(
        "Não há sessões disponíveis neste pacote",
        "CONFLICT",
      );
  }
}
