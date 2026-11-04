import { EquipmentError } from "./equipment-error";
export type EquipmentStatus = "ACTIVE" | "MAINTENANCE" | "RETIRED";
export type ShotTracking = "NONE" | "EQUIPMENT" | "COMPONENT";
export interface EquipmentData {
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  shotTracking: ShotTracking;
  maintenanceIntervalMonths: number;
}
export interface ComponentData {
  name: string;
  serialNumber?: string | null;
  specification?: string | null;
  nominalCapacity?: number | null;
}
export function text(
  value: string,
  label: string,
  max: number,
  min = 1,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new EquipmentError(`${label} inválido`);
  return value.trim();
}
export function optionalText(
  value: string | null | undefined,
  label: string,
  max: number,
): string | null {
  return value == null ? null : text(value, label, max);
}
export function assertStatus(value: string): asserts value is EquipmentStatus {
  if (!["ACTIVE", "MAINTENANCE", "RETIRED"].includes(value))
    throw new EquipmentError("Situação inválida");
}
export function assertTransition(
  previous: EquipmentStatus,
  next: EquipmentStatus,
): void {
  assertStatus(next);
  if (previous === "RETIRED")
    throw new EquipmentError(
      "Recurso aposentado não pode ser alterado",
      "CONFLICT",
    );
  if (previous === next)
    throw new EquipmentError("Recurso já está nessa situação", "CONFLICT");
}
