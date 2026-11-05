import { ApplicationError } from "../../shared/domain/application-error";
import { Money } from "../../shared/domain/money";
const COMPETENCE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DUE_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Full-payment scope only (no partial payments/reversals in this stage). */
export class Expense {
  static assertRevisionInput(input: {
    description: string;
    amount: number;
    dueDate: string;
    competenceMonth: string;
    reason: string;
  }) {
    if (!input.description.trim() || input.description.trim().length > 255)
      throw new ApplicationError("Descrição inválida", "INVALID_INPUT");
    Money.from(input.amount);
    if (Money.from(input.amount).cents <= 0)
      throw new ApplicationError(
        "Valor da despesa deve ser maior que zero",
        "INVALID_INPUT",
      );
    if (!DUE_DATE.test(input.dueDate))
      throw new ApplicationError("Vencimento inválido", "INVALID_INPUT");
    if (!COMPETENCE.test(input.competenceMonth))
      throw new ApplicationError("Competência inválida", "INVALID_INPUT");
    if (input.reason.trim().length < 3 || input.reason.trim().length > 1000)
      throw new ApplicationError(
        "Informe o motivo da revisão",
        "INVALID_INPUT",
      );
  }
  /** A revision cannot be created while an unreversed payment exists; reverse it first. */
  static assertRevisable(hasActivePayment: boolean) {
    if (hasActivePayment)
      throw new ApplicationError(
        "Despesa paga não pode ser revisada; estorne o pagamento antes de corrigir",
        "CONFLICT",
      );
  }
  static assertPayment(
    amount: number,
    revisionAmountCents: number,
    hasActivePayment: boolean,
  ) {
    if (hasActivePayment)
      throw new ApplicationError("Despesa já está paga", "CONFLICT");
    if (Money.from(amount).cents !== revisionAmountCents)
      throw new ApplicationError(
        "Pagamento integral deve corresponder ao valor atual da despesa",
        "INVALID_INPUT",
      );
  }
  static assertReversal(hasPayment: boolean, alreadyReversed: boolean) {
    if (!hasPayment)
      throw new ApplicationError(
        "Despesa não possui pagamento ativo",
        "CONFLICT",
      );
    if (alreadyReversed)
      throw new ApplicationError("Pagamento já estornado", "CONFLICT");
  }
  static assertCancellation(hasActivePayment: boolean) {
    if (hasActivePayment)
      throw new ApplicationError(
        "Estorne o pagamento antes de cancelar a despesa",
        "CONFLICT",
      );
  }
}
