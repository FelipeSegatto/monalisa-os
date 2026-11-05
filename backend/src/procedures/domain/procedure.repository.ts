import { Procedure } from "./procedure";
import { EquipmentAvailability } from "./procedure.types";
export abstract class ProcedureRepository {
  abstract create(procedure: Procedure): Promise<number>;
  abstract updateLocked(
    id: number,
    change: (procedure: Procedure, availability: EquipmentAvailability) => void,
  ): Promise<void>;
}
