import { ApplicationError } from "../../shared/domain/application-error";
/** A birthday is a calendar date, never an instant in the clinic's timezone. */
export class BirthDate {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }
  static isValid(value: string): boolean {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number(value.slice(0, 4)) >= 1000 &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
    );
  }
  static from(value: string): BirthDate {
    if (!this.isValid(value))
      throw new ApplicationError(
        "Data de nascimento inválida",
        "INVALID_INPUT",
      );
    return new BirthDate(value);
  }
  static fromStorage(value: Date): BirthDate {
    return this.from(value.toISOString().slice(0, 10));
  }
  toStorage(): Date {
    return new Date(`${this.value}T00:00:00.000Z`);
  }
  toString(): string {
    return this.value;
  }
}
