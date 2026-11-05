export type ExpenseCategory =
  | "INSUMOS"
  | "EQUIPAMENTOS_MANUTENCAO"
  | "MARKETING"
  | "ALUGUEL_ESTRUTURA"
  | "SERVICOS"
  | "PESSOAL"
  | "OUTROS";
export type ExpenseRecurrence = "ONCE" | "RECURRING";
export type ExpensePaymentMethod = "PIX" | "CASH" | "CARD";
export type ExpenseDestination = "GENERAL" | "PROCEDURES" | "MIXED";
export type ExpenseBasis = "VALUE" | "PERCENT";
export interface AllocationLineInput {
  procedureId: number | null;
  value: number;
}
export interface ExpenseRevisionInput {
  description: string;
  category: ExpenseCategory;
  supplier: string | null;
  amount: number;
  dueDate: string;
  competenceMonth: string;
  recurrence: ExpenseRecurrence;
  destination: ExpenseDestination;
  basis: ExpenseBasis;
  allocations: AllocationLineInput[];
  allocationNote: string;
  reason: string;
}
