import { ApplicationError } from "./application-error";
/** Contact address: validates without silently changing its display casing. */
export class ContactEmail {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }
  static from(value: string): ContactEmail {
    if (
      typeof value !== "string" ||
      value.length > 190 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
      throw new ApplicationError("Email inválido", "INVALID_INPUT");
    return new ContactEmail(value);
  }
  toString(): string {
    return this.value;
  }
}
