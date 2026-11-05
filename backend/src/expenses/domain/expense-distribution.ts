import { ApplicationError } from "../../shared/domain/application-error";
import { Money, allocate } from "../../shared/domain/money";
import {
  AllocationLineInput,
  ExpenseBasis,
  ExpenseDestination,
} from "./expense.types";
export interface AllocationLine {
  procedureId: number | null;
  inputValue: number;
  amountCents: number;
}
/** Manual, auditable rateio: explicit lines only, never inferred from sales/sessions/other criteria. */
export class ExpenseDistribution {
  private constructor(readonly lines: readonly AllocationLine[]) {}
  static compute(
    totalAmount: number,
    destination: ExpenseDestination,
    basis: ExpenseBasis,
    allocations: readonly AllocationLineInput[],
    note: string,
  ): ExpenseDistribution {
    if (note.trim().length < 3 || note.trim().length > 1000)
      throw new ApplicationError(
        "Informe o critério/observação da distribuição",
        "INVALID_INPUT",
      );
    if (!allocations.length || allocations.length > 100)
      throw new ApplicationError(
        "Distribuição sem itens ou acima do limite",
        "INVALID_INPUT",
      );
    const totalCents = Money.from(totalAmount).cents;
    const generalLines = allocations.filter((a) => a.procedureId === null);
    const procedureLines = allocations.filter((a) => a.procedureId !== null);
    if (generalLines.length > 1)
      throw new ApplicationError(
        "Apenas uma parcela geral é permitida",
        "INVALID_INPUT",
      );
    const procedureIds = procedureLines.map((a) => a.procedureId as number);
    if (new Set(procedureIds).size !== procedureIds.length)
      throw new ApplicationError(
        "Procedimento duplicado na distribuição",
        "INVALID_INPUT",
      );
    if (destination === "GENERAL") {
      if (generalLines.length !== 1 || procedureLines.length !== 0)
        throw new ApplicationError(
          "Despesa geral deve ter só a parcela geral",
          "INVALID_INPUT",
        );
    } else if (destination === "PROCEDURES") {
      if (generalLines.length !== 0 || procedureLines.length === 0)
        throw new ApplicationError(
          "Despesa por procedimento não deve ter parcela geral",
          "INVALID_INPUT",
        );
    } else {
      if (generalLines.length !== 1 || procedureLines.length === 0)
        throw new ApplicationError(
          "Despesa mista exige parcela geral explícita e ao menos um procedimento",
          "INVALID_INPUT",
        );
    }
    let amounts: number[];
    if (basis === "VALUE") {
      amounts = allocations.map((a) => Money.from(a.value).cents);
      const sum = amounts.reduce((n, v) => n + v, 0);
      if (sum !== totalCents)
        throw new ApplicationError(
          "A soma dos valores não fecha com o total da despesa",
          "INVALID_INPUT",
        );
    } else {
      const basisPoints = allocations.map((a) => Money.from(a.value).cents);
      const sum = basisPoints.reduce((n, v) => n + v, 0);
      if (sum !== 10000)
        throw new ApplicationError(
          "A soma dos percentuais deve fechar 100%",
          "INVALID_INPUT",
        );
      amounts = allocate(totalCents, basisPoints);
    }
    return new ExpenseDistribution(
      allocations.map((a, index) => ({
        procedureId: a.procedureId,
        inputValue: a.value,
        amountCents: amounts[index],
      })),
    );
  }
}
