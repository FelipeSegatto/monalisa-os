export type ProcedureTechnology =
  "GENERAL" | "HIFU" | "LASER_HAIR_REMOVAL" | "TATTOO_REMOVAL";
export type TreatmentOptionKind = "AREA" | "SIZE" | "OTHER";
export interface ProcedureDetails {
  categoryId: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
}
export interface OptionInput {
  id?: number | null;
  kind?: TreatmentOptionKind;
  groupName: string | null;
  name: string;
  reference: string | null;
  price: number;
  active: boolean;
}
export interface OptionSnapshot extends Omit<OptionInput, "id" | "kind"> {
  id: number | null;
  kind: TreatmentOptionKind;
  sortOrder: number;
}
export interface MaterialInput {
  stockItemId: number;
  quantity: number;
}
export interface EquipmentAvailability {
  reviewed: boolean;
  hasActiveCompatible: boolean;
}
