import { EquipmentError } from "./equipment-error";

/** Immutable calendar date, independent of server timezone. */
export class CivilDate {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static isValid(value: string): boolean {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
    );
  }

  static from(value: string): CivilDate {
    if (!CivilDate.isValid(value))
      throw new EquipmentError("Data inválida (AAAA-MM-DD)");
    return new CivilDate(value);
  }

  addMonths(months: number): CivilDate {
    if (!Number.isInteger(months) || months < 1 || months > 120)
      throw new EquipmentError(
        "Intervalo de manutenção deve ser de 1 a 120 meses",
      );
    const first = new Date(this.value);
    const day = first.getUTCDate();
    first.setUTCDate(1);
    first.setUTCMonth(first.getUTCMonth() + months);
    const end = new Date(first);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    first.setUTCDate(Math.min(day, end.getUTCDate()));
    return CivilDate.from(first.toISOString().slice(0, 10));
  }

  isAfter(other: CivilDate): boolean {
    return this.value > other.value;
  }
  daysUntil(other: CivilDate): number {
    return (Date.parse(other.value) - Date.parse(this.value)) / 86400000;
  }
  toString(): string {
    return this.value;
  }
}
