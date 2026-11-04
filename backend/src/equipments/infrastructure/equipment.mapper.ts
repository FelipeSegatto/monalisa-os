import { Prisma } from "@prisma/client";
import { Equipment } from "../domain/equipment";
import { EquipmentView } from "../application/equipment.queries";
import { MaintenanceSchedule } from "../domain/maintenance-schedule";
import { CivilDate } from "../domain/civil-date";
type EquipmentRow = Prisma.EquipmentGetPayload<{
  include: { components: true };
}>;
export class EquipmentMapper {
  private static date(value: Date | null): string | null {
    return value?.toISOString().slice(0, 10) ?? null;
  }
  static toDomain(row: EquipmentRow): Equipment {
    return Equipment.restore({
      ...row,
      lastMaintenanceDate: this.date(row.lastMaintenanceDate),
      nextMaintenanceDate: this.date(row.nextMaintenanceDate),
      components: row.components,
    });
  }
  static toView<T extends EquipmentRow>(
    row: T,
    today: CivilDate,
  ): Omit<T, "lastMaintenanceDate" | "nextMaintenanceDate"> & EquipmentView {
    const schedule = MaintenanceSchedule.restore({
      ...row,
      lastMaintenanceDate: this.date(row.lastMaintenanceDate),
      nextMaintenanceDate: this.date(row.nextMaintenanceDate),
    });
    return {
      ...row,
      ...schedule.snapshot(),
      maintenanceState: schedule.state(today, row.status === "RETIRED"),
    };
  }
  static fields(equipment: Equipment) {
    const { id, components, ...data } = equipment.snapshot();
    return {
      ...data,
      lastMaintenanceDate: data.lastMaintenanceDate
        ? new Date(data.lastMaintenanceDate)
        : null,
      nextMaintenanceDate: data.nextMaintenanceDate
        ? new Date(data.nextMaintenanceDate)
        : null,
    };
  }
}
