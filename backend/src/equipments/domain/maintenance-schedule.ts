import { CivilDate } from "./civil-date";
import { EquipmentError } from "./equipment-error";

export type MaintenanceState =
  "UNKNOWN" | "OVERDUE" | "DUE_SOON" | "OK" | "NOT_APPLICABLE";
export interface MaintenanceSnapshot {
  maintenanceIntervalMonths: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
}

/** Replacing a schedule never mutates a previously issued value. */
export class MaintenanceSchedule {
  private constructor(
    readonly intervalMonths: number,
    readonly lastDate: CivilDate | null,
    readonly nextDate: CivilDate | null,
  ) {
    if (
      !Number.isInteger(intervalMonths) ||
      intervalMonths < 1 ||
      intervalMonths > 120
    )
      throw new EquipmentError(
        "Intervalo de manutenção deve ser de 1 a 120 meses",
      );
    if (lastDate && nextDate && !nextDate.isAfter(lastDate))
      throw new EquipmentError(
        "Próxima manutenção deve ser posterior à última",
      );
    Object.freeze(this);
  }

  static restore(data: MaintenanceSnapshot): MaintenanceSchedule {
    return new MaintenanceSchedule(
      data.maintenanceIntervalMonths,
      data.lastMaintenanceDate
        ? CivilDate.from(data.lastMaintenanceDate)
        : null,
      data.nextMaintenanceDate
        ? CivilDate.from(data.nextMaintenanceDate)
        : null,
    );
  }
  static empty(intervalMonths = 12): MaintenanceSchedule {
    return new MaintenanceSchedule(intervalMonths, null, null);
  }
  withInterval(months: number): MaintenanceSchedule {
    return new MaintenanceSchedule(months, this.lastDate, this.nextDate);
  }
  schedule(next: CivilDate): MaintenanceSchedule {
    return new MaintenanceSchedule(this.intervalMonths, this.lastDate, next);
  }
  record(
    performed: CivilDate,
    today: CivilDate,
    next?: CivilDate,
  ): MaintenanceSchedule {
    if (performed.isAfter(today))
      throw new EquipmentError("Manutenção realizada não pode estar no futuro");
    if (this.lastDate && !performed.isAfter(this.lastDate))
      throw new EquipmentError(
        "Já existe manutenção nessa data ou em data posterior",
        "CONFLICT",
      );
    return new MaintenanceSchedule(
      this.intervalMonths,
      performed,
      next ?? performed.addMonths(this.intervalMonths),
    );
  }
  state(today: CivilDate, retired = false): MaintenanceState {
    if (retired) return "NOT_APPLICABLE";
    if (!this.nextDate) return "UNKNOWN";
    const days = today.daysUntil(this.nextDate);
    return days < 0 ? "OVERDUE" : days <= 30 ? "DUE_SOON" : "OK";
  }
  snapshot(): MaintenanceSnapshot {
    return {
      maintenanceIntervalMonths: this.intervalMonths,
      lastMaintenanceDate: this.lastDate?.toString() ?? null,
      nextMaintenanceDate: this.nextDate?.toString() ?? null,
    };
  }
}
