import { EquipmentAvailability } from "../domain/procedure.types";
export abstract class EquipmentCompatibilityPort {
  abstract availability(procedureId: number): Promise<EquipmentAvailability>;
}
