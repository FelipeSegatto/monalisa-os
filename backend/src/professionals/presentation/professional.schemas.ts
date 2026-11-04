import { z } from "zod";
export const professionalInput = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().max(30).nullable(),
  email: z.string().email().max(190).nullable(),
  color: z.string().max(16).nullable(),
  active: z.boolean(),
});
export const accountInput = z.object({
  email: z.string().email().max(190),
  password: z.string().min(10).max(200),
});
