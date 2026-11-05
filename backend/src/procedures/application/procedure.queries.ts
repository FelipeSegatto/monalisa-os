import {
  ProcedureTechnology,
  TreatmentOptionKind,
} from "../domain/procedure.types";
export interface ProcedureView {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  detailImageUrl: string | null;
  durationMinutes: number;
  price: number;
  active: boolean;
  displayPrice: number;
  hasVariations: boolean;
  technology: ProcedureTechnology;
  requiresEquipment: boolean;
  variations: {
    id: number;
    groupName: string | null;
    name: string;
    reference: string | null;
    price: number;
    active: boolean;
    sortOrder: number;
    kind: TreatmentOptionKind;
  }[];
}
export interface ProcedureMaterialsView {
  materials: {
    stockItemId: number;
    itemName: string;
    unit: string;
    quantity: string;
  }[];
}
export abstract class ProcedureQueries {
  abstract categories(
    publicOnly?: boolean,
  ): Promise<{
    categories: { id: number; name: string; procedures: ProcedureView[] }[];
  }>;
  abstract detail(id: number): Promise<ProcedureView>;
  abstract materials(id: number): Promise<ProcedureMaterialsView>;
}
