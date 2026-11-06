import { z } from "zod";
import { validDay } from "../domain/commercial-offer";
const id = z.number().int().positive();
const amount = z.number().finite().nonnegative().max(9999999999.99);
const day = z.string().refine(validDay, "Data inválida");
export const reason = z.string().trim().min(3).max(1000);
export const discountInput = z.object({
  type: z.enum(["FIXED", "PERCENT"]),
  value: amount.positive(),
  reason,
});
export const versionInput = z.object({
  name: z.string().trim().min(2).max(150),
  startsOn: day,
  endsOn: day.nullable(),
  sessionValidityDays: z.number().int().min(1).max(3650).nullable(),
  price: amount,
  terms: z.string().trim().max(2000).nullable(),
  items: z
    .array(
      z.object({
        procedureId: id,
        variationId: id.nullable().optional(),
        sessions: z.number().int().min(1).max(1000),
      }),
    )
    .min(1)
    .max(50),
});
export const paymentInput = z
  .object({
    amount: amount.positive(),
    method: z.enum(["PIX", "CASH", "CARD"]),
    installments: z.number().int().min(1).max(48).nullable().optional(),
    requestKey: z.string().uuid(),
  })
  .refine(
    (p) => p.method === "CARD" || p.installments == null,
    "Parcelas do cartão só se aplicam a cartão",
  );
const line = z
  .object({
    offerVersionId: id.optional(),
    quantity: z.number().int().min(1).max(100).optional(),
    procedureId: id.optional(),
    variationId: id.nullable().optional(),
    sessions: z.number().int().min(1).max(1000).optional(),
    discount: discountInput.optional(),
    sessionValidityDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .nullable()
      .optional(),
  })
  .refine(
    (l) => Boolean(l.offerVersionId) !== Boolean(l.procedureId),
    "Escolha oferta ou procedimento avulso",
  )
  .refine(
    (l) => !l.offerVersionId || !l.discount,
    "Desconto adicional da oferta deve ser aplicado à venda",
  );
export const saleInput = z.object({
  customerId: id,
  professionalId: id.nullable().optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
  allowUnpaidUse: z.boolean().default(false),
  requestKey: z.string().uuid(),
  lines: z.array(line).min(1).max(50),
  discount: discountInput.optional(),
  initialPayment: z
    .object({
      amount: amount.positive(),
      method: z.enum(["PIX", "CASH", "CARD"]),
      installments: z.number().int().min(1).max(48).nullable().optional(),
    })
    .nullable()
    .optional(),
  receivables: z
    .array(z.object({ amount: amount.positive(), dueOn: day }))
    .max(120)
    .optional(),
});

export const saleListInput = z
  .object({
    customerId: z.coerce.number().int().positive().optional(),
    before: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().max(120).optional(),
    start: day.optional(),
    end: day.optional(),
    status: z.enum(["PENDING", "PARTIAL", "PAID", "CANCELLED"]).optional(),
  })
  .refine(
    (input) => !input.start || !input.end || input.start <= input.end,
    "Período inválido",
  );
