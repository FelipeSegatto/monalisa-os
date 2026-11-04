import { Injectable } from "@nestjs/common";
import { EquipmentClock } from "../application/equipment-clock";
import { CivilDate } from "../domain/civil-date";
@Injectable()
export class SystemEquipmentClock extends EquipmentClock {
  today(): CivilDate {
    return CivilDate.from(
      new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10),
    );
  }
}
