import { z } from "zod";
import { validDate } from "../domain/equipment-policy";
const text = z.string().trim().min(1).max(150);
const optionalText = z.string().trim().min(1).max(120).nullable().optional();
export const calendarDate = z
  .string()
  .refine(validDate, "Data inválida (AAAA-MM-DD)");
export const equipmentInput = z
  .object({
    name: text,
    manufacturer: optionalText,
    model: optionalText,
    serialNumber: optionalText,
    shotTracking: z.enum(["NONE", "EQUIPMENT", "COMPONENT"]).default("NONE"),
    maintenanceIntervalMonths: z.number().int().min(1).max(120).default(12),
  })
  .strict();
export const componentInput = z
  .object({
    name: text,
    serialNumber: optionalText,
    specification: z.string().trim().min(1).max(500).nullable().optional(),
    nominalCapacity: z
      .number()
      .int()
      .positive()
      .max(2147483647)
      .nullable()
      .optional(),
  })
  .strict();
export const statusInput = z
  .object({
    status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED"]),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export const scheduleInput = z
  .object({
    nextDate: calendarDate,
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export const maintenanceInput = z
  .object({
    performedOn: calendarDate,
    nextDate: calendarDate.optional(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export const compatibilityInput = z
  .object({
    equipmentIds: z
      .array(z.number().int().positive())
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Equipamento duplicado",
      ),
  })
  .strict();
