import { z } from "zod";
import { acquisitionSources } from "../domain/customer";
import { BirthDate } from "../domain/birth-date";
export const customerInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.string().email().max(190).nullable(),
  birthDate: z
    .string()
    .refine(BirthDate.isValid, "Data de nascimento inválida")
    .nullable(),
  acquisitionSource: z.enum(acquisitionSources),
});
export const customerFilter = z.object({
  search: z.string().optional(),
  source: z.union([z.enum(acquisitionSources), z.literal("ALL")]).optional(),
});
export const noteInput = z.object({
  title: z.string().trim().min(1).max(150),
  content: z.string().trim().min(1).max(10000),
});
