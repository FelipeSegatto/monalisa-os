import { Equipment } from "./equipment";
/** Writes are atomic with their audit events. No ORM/HTTP types cross this port. */
export abstract class EquipmentRepository {
  abstract create(equipment: Equipment, actorId: number): Promise<number>;
  abstract updateLocked(
    id: number,
    actorId: number,
    change: (equipment: Equipment) => void,
  ): Promise<void>;
  abstract reviseProcedureResources(
    procedureId: number,
    ids: readonly number[],
    actorId: number,
  ): Promise<void>;
}
