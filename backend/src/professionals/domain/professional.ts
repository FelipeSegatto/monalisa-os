import { ApplicationError } from "../../shared/domain/application-error";
import { ContactEmail } from "../../shared/domain/contact-email";
export interface ProfessionalData {
  name: string;
  phone: string | null;
  email: string | null;
  color: string | null;
  active: boolean;
}
export interface ProfessionalSnapshot extends Omit<ProfessionalData, "color"> {
  id: number | null;
  color: string;
}
export class Professional {
  private data: Omit<ProfessionalSnapshot, "id">;
  private constructor(
    readonly id: number | null,
    data: ProfessionalData,
  ) {
    this.data = Professional.validate(data);
  }
  private static validate(data: ProfessionalData) {
    if (
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.trim().length > 120
    )
      throw new ApplicationError(
        "Nome profissional deve ter entre 1 e 120 caracteres",
        "INVALID_INPUT",
      );
    if (
      data.phone !== null &&
      (typeof data.phone !== "string" || data.phone.length > 30)
    )
      throw new ApplicationError(
        "Telefone profissional deve ter até 30 caracteres",
        "INVALID_INPUT",
      );
    const color = data.color || "#0d9488";
    if (typeof color !== "string" || color.length > 16)
      throw new ApplicationError("Cor inválida", "INVALID_INPUT");
    if (typeof data.active !== "boolean")
      throw new ApplicationError(
        "Situação profissional inválida",
        "INVALID_INPUT",
      );
    return {
      name: data.name.trim(),
      phone: data.phone,
      email:
        data.email === null ? null : ContactEmail.from(data.email).toString(),
      color,
      active: data.active,
    };
  }
  static create(data: ProfessionalData): Professional {
    return new Professional(null, data);
  }
  static restore(data: ProfessionalSnapshot): Professional {
    return new Professional(data.id, data);
  }
  updateProfile(data: ProfessionalData): void {
    this.data = Professional.validate(data);
  }
  activate(): void {
    this.data = { ...this.data, active: true };
  }
  deactivate(): void {
    this.data = { ...this.data, active: false };
  }
  snapshot(): ProfessionalSnapshot {
    return { id: this.id, ...this.data };
  }
}
