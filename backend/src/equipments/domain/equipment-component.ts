import {
  ComponentData,
  EquipmentStatus,
  assertStatus,
  assertTransition,
  optionalText,
  text,
} from "./equipment.types";
import { EquipmentError } from "./equipment-error";

export interface ComponentSnapshot {
  id: number | null;
  code: string;
  name: string;
  serialNumber: string | null;
  specification: string | null;
  nominalCapacity: number | null;
  status: EquipmentStatus;
}
export class EquipmentComponent {
  private state: ComponentSnapshot;
  private constructor(data: ComponentSnapshot) {
    assertStatus(data.status);
    this.state = {
      id: data.id,
      status: data.status,
      ...EquipmentComponent.validate(data),
      code: text(data.code, "Código", 50),
    };
  }
  private static validate(data: ComponentData) {
    const capacity = data.nominalCapacity ?? null;
    if (
      capacity !== null &&
      (!Number.isInteger(capacity) || capacity <= 0 || capacity > 2147483647)
    )
      throw new EquipmentError("Capacidade nominal inválida");
    return {
      name: text(data.name, "Nome", 150),
      serialNumber: optionalText(data.serialNumber, "Número de série", 120),
      specification: optionalText(data.specification, "Especificação", 500),
      nominalCapacity: capacity,
    };
  }
  static create(code: string, data: ComponentData): EquipmentComponent {
    return new EquipmentComponent({
      id: null,
      code,
      status: "ACTIVE",
      ...this.validate(data),
    });
  }
  static restore(data: ComponentSnapshot): EquipmentComponent {
    return new EquipmentComponent(data);
  }
  get id(): number | null {
    return this.state.id;
  }
  get code(): string {
    return this.state.code;
  }
  update(data: ComponentData): void {
    if (this.state.status === "RETIRED")
      throw new EquipmentError("Componente aposentado", "CONFLICT");
    this.state = {
      ...this.state,
      ...EquipmentComponent.validate({
        ...data,
        serialNumber:
          data.serialNumber === undefined
            ? this.state.serialNumber
            : data.serialNumber,
        specification:
          data.specification === undefined
            ? this.state.specification
            : data.specification,
        nominalCapacity:
          data.nominalCapacity === undefined
            ? this.state.nominalCapacity
            : data.nominalCapacity,
      }),
    };
  }
  changeStatus(status: EquipmentStatus): void {
    assertTransition(this.state.status, status);
    this.state = { ...this.state, status };
  }
  snapshot(): ComponentSnapshot {
    return { ...this.state };
  }
}
