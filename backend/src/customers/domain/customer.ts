import { ApplicationError } from "../../shared/domain/application-error";
import { ContactEmail } from "../../shared/domain/contact-email";
import { BirthDate } from "./birth-date";
import { CustomerNote } from "./customer-note";
export const acquisitionSources = [
  "INDICACAO",
  "INSTAGRAM",
  "WHATSAPP",
  "GOOGLE",
  "OUTRO",
] as const;
export type AcquisitionSource = (typeof acquisitionSources)[number];
export const acquisitionLabels: Record<AcquisitionSource, string> = {
  INDICACAO: "Indicação",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  GOOGLE: "Google",
  OUTRO: "Outro",
};
export interface CustomerData {
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  acquisitionSource: AcquisitionSource;
}
export interface CustomerSnapshot extends CustomerData {
  id: number | null;
}
export class Customer {
  private data: CustomerData;
  private constructor(
    readonly id: number | null,
    data: CustomerData,
  ) {
    this.data = Customer.validate(data);
  }
  private static validate(data: CustomerData): CustomerData {
    if (
      typeof data.name !== "string" ||
      data.name.trim().length < 2 ||
      data.name.trim().length > 120
    )
      throw new ApplicationError(
        "Nome deve ter entre 2 e 120 caracteres",
        "INVALID_INPUT",
      );
    if (
      typeof data.phone !== "string" ||
      data.phone.trim().length < 8 ||
      data.phone.trim().length > 30
    )
      throw new ApplicationError(
        "Telefone deve ter entre 8 e 30 caracteres",
        "INVALID_INPUT",
      );
    if (!acquisitionSources.includes(data.acquisitionSource))
      throw new ApplicationError(
        "Origem de aquisição inválida",
        "INVALID_INPUT",
      );
    return {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email:
        data.email === null ? null : ContactEmail.from(data.email).toString(),
      birthDate:
        data.birthDate === null
          ? null
          : BirthDate.from(data.birthDate).toString(),
      acquisitionSource: data.acquisitionSource,
    };
  }
  static create(data: CustomerData): Customer {
    return new Customer(null, data);
  }
  static restore(snapshot: CustomerSnapshot): Customer {
    return new Customer(snapshot.id, snapshot);
  }
  updateProfile(data: CustomerData): void {
    this.data = Customer.validate(data);
  }
  addNote(title: string, content: string, author: string): CustomerNote {
    if (this.id === null)
      throw new ApplicationError(
        "Cliente precisa estar cadastrado",
        "CONFLICT",
      );
    return CustomerNote.create(this.id, title, content, author);
  }
  snapshot(): CustomerSnapshot {
    return { id: this.id, ...this.data };
  }
}
