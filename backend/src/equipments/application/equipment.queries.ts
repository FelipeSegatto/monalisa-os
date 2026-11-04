import { EquipmentSnapshot } from "../domain/equipment";
import { ComponentSnapshot } from "../domain/equipment-component";
import { MaintenanceState } from "../domain/maintenance-schedule";
export interface EquipmentView extends Omit<
  EquipmentSnapshot,
  "id" | "components"
> {
  id: number;
  components: (ComponentSnapshot & { id: number })[];
  maintenanceState: MaintenanceState;
  createdAt: Date;
  updatedAt: Date;
}
export interface EquipmentEventView {
  id: number;
  type: string;
  reason: string | null;
  details: unknown;
  occurredOn: Date | null;
  createdAt: Date;
  actor: { id: number; name: string };
}
export interface EquipmentDetailView extends EquipmentView {
  procedures: { procedure: { id: number; name: string } }[];
  events: EquipmentEventView[];
}
export interface ProcedureResourcesView {
  reviewedAt: Date | null;
  materialsReviewedAt: Date | null;
  equipment: EquipmentView[];
}
/** Read projections can be loaded without restoring a writable aggregate. */
export abstract class EquipmentQueries {
  abstract list(): Promise<{ equipment: EquipmentView[] }>;
  abstract detail(id: number): Promise<EquipmentDetailView>;
  abstract history(
    id: number,
    before?: number,
  ): Promise<{ events: EquipmentEventView[] }>;
  abstract procedureResources(
    procedureId: number,
  ): Promise<ProcedureResourcesView>;
}
