import { queryDay } from "../../shared/presentation/listing-query";
import { z } from "zod";
const CATEGORY = z.enum([
  "INSUMOS",
  "EQUIPAMENTOS_MANUTENCAO",
  "MARKETING",
  "ALUGUEL_ESTRUTURA",
  "SERVICOS",
  "PESSOAL",
  "OUTROS",
]);
const METHOD = z.enum(["PIX", "CASH", "CARD"]);
const allocationLine = z.object({
  procedureId: z.number().int().positive().nullable(),
  value: z.number().finite(),
});
export const expenseRevisionInput = z.object({
  description: z.string().trim().min(2).max(255),
  category: CATEGORY,
  supplier: z.string().trim().max(190).nullable(),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  competenceMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  recurrence: z.enum(["ONCE", "RECURRING"]),
  destination: z.enum(["GENERAL", "PROCEDURES", "MIXED"]),
  basis: z.enum(["VALUE", "PERCENT"]),
  allocations: z.array(allocationLine).min(1).max(100),
  allocationNote: z.string().trim().min(3).max(1000),
  reason: z.string().trim().min(3).max(1000),
});
export const expensePaymentInput = z.object({
  amount: z.number().positive(),
  method: METHOD,
  paidAt: z.string(),
  requestKey: z.string().min(8).max(100),
});
export const expenseReversalInput = z.object({
  reason: z.string().trim().min(3).max(1000),
  requestKey: z.string().min(8).max(100),
});
export const expenseCancellationInput = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const expenseListInput = z
  .object({
    procedureId: z.coerce.number().int().positive().optional(),
    before: z.coerce.number().int().positive().optional(),
    category: CATEGORY.optional(),
    status: z.enum(["PAID", "PENDING", "CANCELLED"]).optional(),
    destination: z.enum(["GENERAL", "PROCEDURES", "MIXED"]).optional(),
    dueStart: queryDay.optional(),
    dueEnd: queryDay.optional(),
    search: z.string().trim().max(120).optional(),
  })
  .refine(
    (input) =>
      !input.dueStart || !input.dueEnd || input.dueStart <= input.dueEnd,
    "Período inválido",
  );
