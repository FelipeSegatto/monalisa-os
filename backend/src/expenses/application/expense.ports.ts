import { Actor } from "../../auth/domain/actor";
import { ExpenseRevisionInput } from "../domain/expense.types";
export interface ExpenseListFilters {
  procedureId?: number;
  destination?: "GENERAL" | "PROCEDURES" | "MIXED";
  dueStart?: string;
  dueEnd?: string;
  search?: string;
  before?: number;
}
export abstract class ExpenseQueries {
  abstract list(filters: ExpenseListFilters, actor: Actor): Promise<any>;
  abstract records(actor: Actor): Promise<any>;
  abstract detail(id: number, actor: Actor): Promise<any>;
  abstract performance(month: string, actor: Actor): Promise<any>;
  abstract series(months: number, actor: Actor): Promise<any>;
}
export abstract class ExpenseRepository {
  abstract create(input: ExpenseRevisionInput, actor: Actor): Promise<any>;
  abstract revise(
    id: number,
    input: ExpenseRevisionInput,
    actor: Actor,
  ): Promise<any>;
  abstract pay(
    id: number,
    input: {
      amount: number;
      method: "PIX" | "CASH" | "CARD";
      paidAt: string;
      requestKey: string;
    },
    actor: Actor,
  ): Promise<any>;
  abstract reversePayment(
    id: number,
    paymentId: number,
    reason: string,
    requestKey: string,
    actor: Actor,
  ): Promise<any>;
  abstract cancel(id: number, reason: string, actor: Actor): Promise<any>;
}
