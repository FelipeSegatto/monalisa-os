import { ApplicationError } from "../../shared/domain/application-error";
import { OptionInput, OptionSnapshot } from "./procedure.types";
import { nullableText, price, text } from "./procedure-validation";
export class TreatmentOption {
  private data: OptionSnapshot;
  private constructor(data: OptionSnapshot) {
    this.data = {
      ...TreatmentOption.validate(data),
      id: data.id,
      kind: data.kind,
      sortOrder: data.sortOrder,
    };
  }
  private static validate(data: OptionInput) {
    if (
      data.kind !== undefined &&
      !["AREA", "SIZE", "OTHER"].includes(data.kind)
    )
      throw new ApplicationError("Tipo de opção inválido", "INVALID_INPUT");
    if (typeof data.active !== "boolean")
      throw new ApplicationError("Situação da opção inválida", "INVALID_INPUT");
    return {
      name: text(data.name, 140, "Nome da opção"),
      groupName: nullableText(data.groupName, 80, "Grupo"),
      reference: nullableText(data.reference, 140, "Referência"),
      price: price(data.price),
      active: data.active,
    };
  }
  static create(data: OptionInput, sortOrder: number): TreatmentOption {
    return new TreatmentOption({
      ...this.validate(data),
      id: null,
      kind: data.kind ?? "OTHER",
      sortOrder,
    });
  }
  static restore(data: OptionSnapshot): TreatmentOption {
    return new TreatmentOption(data);
  }
  get id() {
    return this.data.id;
  }
  update(data: OptionInput, sortOrder: number): void {
    const fields = TreatmentOption.validate(data);
    this.data = {
      ...this.data,
      ...fields,
      kind: data.kind ?? this.data.kind,
      sortOrder,
    };
  }
  deactivate(sortOrder = this.data.sortOrder): void {
    this.data = { ...this.data, active: false, sortOrder };
  }
  snapshot(): OptionSnapshot {
    return { ...this.data };
  }
}
