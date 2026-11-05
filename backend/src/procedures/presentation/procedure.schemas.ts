import { z } from "zod";
const price = z.number().finite().nonnegative().max(9999999999.99);
const technology = z.enum([
  "GENERAL",
  "HIFU",
  "LASER_HAIR_REMOVAL",
  "TATTOO_REMOVAL",
]);
const option = z.object({
  id: z.number().int().positive().nullable().optional(),
  kind: z.enum(["AREA", "SIZE", "OTHER"]).optional(),
  groupName: z.string().max(80).nullable(),
  name: z.string().trim().min(1).max(140),
  reference: z.string().max(140).nullable(),
  price,
  active: z.boolean(),
});
export const procedureInput = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(4000).nullable(),
  durationMinutes: z.number().int().min(5).max(720),
  price,
  active: z.boolean(),
  variations: z.array(option),
  technology: technology.optional(),
  requiresEquipment: z.boolean().optional(),
});
export const activeInput = z.object({ active: z.boolean() });
export const materialInput = z.array(
  z.object({
    stockItemId: z.number().int().positive(),
    quantity: z.number().finite().positive().max(999999999.999),
  }),
);
export const policyInput = z
  .object({ technology, requiresEquipment: z.boolean() })
  .strict();
