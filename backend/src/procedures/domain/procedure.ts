import { ApplicationError } from "../../shared/domain/application-error";
import { TreatmentOption } from "./treatment-option";
import { MaterialRequirement } from "./material-requirement";
import {
  ProcedureDetails,
  ProcedureTechnology,
  OptionSnapshot,
  OptionInput,
  MaterialInput,
  EquipmentAvailability,
} from "./procedure.types";
import { nullableText, positiveId, price, text } from "./procedure-validation";
export interface ProcedureSnapshot extends ProcedureDetails {
  id: number | null;
  active: boolean;
  technology: ProcedureTechnology;
  requiresEquipment: boolean;
  options: OptionSnapshot[];
  materials: MaterialInput[];
  materialsReviewedAt: Date | null;
}
export class Procedure {
  private details: ProcedureDetails;
  private active: boolean;
  private technology: ProcedureTechnology;
  private requiresEquipment: boolean;
  private options: TreatmentOption[];
  private materials: MaterialRequirement[];
  private materialsReviewedAt: Date | null;
  private constructor(
    readonly id: number | null,
    data: ProcedureSnapshot,
  ) {
    this.details = Procedure.validate(data);
    this.active = data.active;
    this.technology = data.technology;
    this.requiresEquipment = data.requiresEquipment;
    this.validatePolicy(this.technology, this.requiresEquipment);
    this.options = data.options.map((option) =>
      TreatmentOption.restore(option),
    );
    this.materials = data.materials.map((material) =>
      MaterialRequirement.from(material),
    );
    this.materialsReviewedAt = data.materialsReviewedAt
      ? new Date(data.materialsReviewedAt)
      : null;
  }
  private static validate(data: ProcedureDetails): ProcedureDetails {
    positiveId(data.categoryId);
    if (
      !Number.isInteger(data.durationMinutes) ||
      data.durationMinutes < 5 ||
      data.durationMinutes > 720
    )
      throw new ApplicationError(
        "Duração deve ser de 5 a 720 minutos",
        "INVALID_INPUT",
      );
    return {
      categoryId: data.categoryId,
      name: text(data.name, 150, "Nome"),
      description: nullableText(data.description, 4000, "Descrição"),
      durationMinutes: data.durationMinutes,
      price: price(data.price),
    };
  }
  private validatePolicy(
    technology: ProcedureTechnology,
    requiresEquipment: boolean,
  ): void {
    if (
      !["GENERAL", "HIFU", "LASER_HAIR_REMOVAL", "TATTOO_REMOVAL"].includes(
        technology,
      ) ||
      typeof requiresEquipment !== "boolean"
    )
      throw new ApplicationError(
        "Política de equipamento inválida",
        "INVALID_INPUT",
      );
    if (technology !== "GENERAL" && !requiresEquipment)
      throw new ApplicationError(
        "Esta tecnologia exige equipamento",
        "CONFLICT",
      );
  }
  static create(details: ProcedureDetails): Procedure {
    return new Procedure(null, {
      id: null,
      ...details,
      active: false,
      technology: "GENERAL",
      requiresEquipment: false,
      options: [],
      materials: [],
      materialsReviewedAt: null,
    });
  }
  static restore(data: ProcedureSnapshot): Procedure {
    return new Procedure(data.id, data);
  }
  updateDetails(details: ProcedureDetails): void {
    this.details = Procedure.validate(details);
  }
  configureEquipment(
    technology: ProcedureTechnology,
    requiresEquipment: boolean,
  ): void {
    if (this.technology !== "GENERAL" && technology !== this.technology)
      throw new ApplicationError(
        "Classificação tecnológica já definida; correção exige revisão administrativa explícita",
        "CONFLICT",
      );
    this.validatePolicy(technology, requiresEquipment);
    this.technology = technology;
    this.requiresEquipment = requiresEquipment;
  }
  activate(availability: EquipmentAvailability): void {
    if (
      this.requiresEquipment &&
      (!availability.reviewed || !availability.hasActiveCompatible)
    )
      throw new ApplicationError(
        "Revise e configure ao menos um equipamento compatível ativo antes de ativar",
        "CONFLICT",
      );
    this.active = true;
  }
  deactivate(): void {
    this.active = false;
  }
  updateActivation(active: boolean, availability: EquipmentAvailability): void {
    if (typeof active !== "boolean")
      throw new ApplicationError("Situação inválida", "INVALID_INPUT");
    if (!active) this.deactivate();
    else if (!this.active) this.activate(availability);
  }
  replaceOptions(input: OptionInput[]): void {
    const staged = this.options.map((option) =>
      TreatmentOption.restore(option.snapshot()),
    );
    const used = new Set<TreatmentOption>();
    const output: TreatmentOption[] = [];
    for (const [row, position] of input.map(
      (row, index) => [row, index] as const,
    )) {
      let option: TreatmentOption | undefined;
      if (row.id != null) {
        option = staged.find((item) => item.id === row.id);
        if (!option)
          throw new ApplicationError(
            "Opção não pertence ao procedimento",
            "INVALID_INPUT",
          );
      } else {
        // Legacy clients without IDs: exact match only. Never guess a rename by array position.
        const matches = staged.filter((item) => {
          const old = item.snapshot();
          return (
            old.name === row.name.trim() &&
            old.groupName === row.groupName &&
            old.reference === row.reference
          );
        });
        if (matches.length > 1)
          throw new ApplicationError(
            "Opções ambíguas; envie seus IDs",
            "CONFLICT",
          );
        option = matches[0];
      }
      if (option) {
        if (used.has(option))
          throw new ApplicationError("Opção duplicada", "INVALID_INPUT");
        option.update(row, position);
        used.add(option);
        output.push(option);
      } else output.push(TreatmentOption.create(row, position));
    }
    for (const option of staged)
      if (!used.has(option)) {
        option.deactivate(output.length);
        output.push(option);
      }
    this.options = output;
  }
  configureMaterials(input: MaterialInput[], reviewedAt: Date): void {
    if (new Set(input.map((item) => item.stockItemId)).size !== input.length)
      throw new ApplicationError("Insumo repetido", "INVALID_INPUT");
    if (!Number.isFinite(+reviewedAt))
      throw new ApplicationError("Data de revisão inválida", "INVALID_INPUT");
    const values = input.map((item) => MaterialRequirement.from(item));
    this.materials = values;
    this.materialsReviewedAt = new Date(reviewedAt);
  }
  snapshot(): ProcedureSnapshot {
    return {
      id: this.id,
      ...this.details,
      active: this.active,
      technology: this.technology,
      requiresEquipment: this.requiresEquipment,
      options: this.options.map((option) => option.snapshot()),
      materials: this.materials.map((item) => item.snapshot()),
      materialsReviewedAt: this.materialsReviewedAt
        ? new Date(this.materialsReviewedAt)
        : null,
    };
  }
}
