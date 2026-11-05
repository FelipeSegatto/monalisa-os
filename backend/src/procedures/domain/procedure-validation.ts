import { ApplicationError } from "../../shared/domain/application-error";
export function text(
  value: string,
  max: number,
  label: string,
  min = 1,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new ApplicationError(`${label} inválido`, "INVALID_INPUT");
  return value.trim();
}
export function nullableText(
  value: string | null,
  max: number,
  label: string,
): string | null {
  return value === null ? null : text(value, max, label, 0);
}
export function price(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 9999999999.99)
    throw new ApplicationError("Preço inválido", "INVALID_INPUT");
  return Math.round(value * 100) / 100;
}
export function positiveId(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new ApplicationError("Identificador inválido", "INVALID_INPUT");
}
