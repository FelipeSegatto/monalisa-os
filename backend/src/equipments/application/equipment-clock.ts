import { CivilDate } from "../domain/civil-date";
export abstract class EquipmentClock {
  abstract today(): CivilDate;
}
