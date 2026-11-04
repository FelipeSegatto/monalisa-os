import { CivilDate } from "./civil-date";
import { EquipmentComponent, ComponentSnapshot } from "./equipment-component";
import { EquipmentError } from "./equipment-error";
import { EquipmentEvent } from "./equipment-event";
import {
  ComponentData,
  EquipmentData,
  EquipmentStatus,
  ShotTracking,
  assertStatus,
  assertTransition,
  optionalText,
  text,
} from "./equipment.types";
import {
  MaintenanceSchedule,
  MaintenanceSnapshot,
} from "./maintenance-schedule";

export interface EquipmentSnapshot extends MaintenanceSnapshot {
  id: number | null;
  code: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  shotTracking: ShotTracking;
  status: EquipmentStatus;
  components: ComponentSnapshot[];
}
export class Equipment {
  private data: Omit<
    EquipmentSnapshot,
    keyof MaintenanceSnapshot | "components"
  >;
  private maintenance: MaintenanceSchedule;
  private readonly components: EquipmentComponent[];
  private readonly events: EquipmentEvent[] = [];
  private constructor(snapshot: EquipmentSnapshot) {
    assertStatus(snapshot.status);
    this.data = {
      id: snapshot.id,
      code: text(snapshot.code, "Código", 50),
      status: snapshot.status,
      ...Equipment.validate(snapshot),
    };
    this.maintenance = MaintenanceSchedule.restore(snapshot);
    this.components = snapshot.components.map((component) =>
      EquipmentComponent.restore(component),
    );
    const codes = this.components.map((component) => component.code);
    if (new Set(codes).size !== codes.length)
      throw new EquipmentError("Componente duplicado");
  }
  private static validate(data: EquipmentData) {
    if (!["NONE", "EQUIPMENT", "COMPONENT"].includes(data.shotTracking))
      throw new EquipmentError("Controle de disparos inválido");
    return {
      name: text(data.name, "Nome", 150),
      manufacturer: optionalText(data.manufacturer, "Fabricante", 120),
      model: optionalText(data.model, "Modelo", 120),
      serialNumber: optionalText(data.serialNumber, "Número de série", 120),
      shotTracking: data.shotTracking,
    };
  }
  static create(code: string, data: EquipmentData): Equipment {
    const equipment = new Equipment({
      id: null,
      code,
      status: "ACTIVE",
      ...this.validate(data),
      ...MaintenanceSchedule.empty(data.maintenanceIntervalMonths).snapshot(),
      components: [],
    });
    equipment.events.push(
      new EquipmentEvent("CREATED", {
        ...equipment.data,
        ...equipment.maintenance.snapshot(),
      }),
    );
    return equipment;
  }
  static restore(snapshot: EquipmentSnapshot): Equipment {
    return new Equipment(snapshot);
  }
  get id(): number | null {
    return this.data.id;
  }
  get pendingEvents(): readonly EquipmentEvent[] {
    return [...this.events];
  }
  assertWritable(): void {
    if (this.data.status === "RETIRED")
      throw new EquipmentError(
        "Equipamento aposentado: histórico preservado, sem novas alterações",
        "CONFLICT",
      );
  }
  update(data: EquipmentData): void {
    this.assertWritable();
    const fields = Equipment.validate({
      ...data,
      manufacturer:
        data.manufacturer === undefined
          ? this.data.manufacturer
          : data.manufacturer,
      model: data.model === undefined ? this.data.model : data.model,
      serialNumber:
        data.serialNumber === undefined
          ? this.data.serialNumber
          : data.serialNumber,
    });
    const schedule = this.maintenance.withInterval(
      data.maintenanceIntervalMonths,
    );
    const before = this.snapshot();
    this.data = { ...this.data, ...fields };
    this.maintenance = schedule;
    this.events.push(
      new EquipmentEvent("UPDATED", {
        before: { ...before },
        after: { ...this.data, ...this.maintenance.snapshot() },
      }),
    );
  }
  addComponent(code: string, data: ComponentData): void {
    this.assertWritable();
    if (this.components.some((component) => component.code === code))
      throw new EquipmentError("Componente duplicado", "CONFLICT");
    const component = EquipmentComponent.create(code, data);
    this.components.push(component);
    this.events.push(
      new EquipmentEvent(
        "COMPONENT_CREATED",
        { ...component.snapshot() },
        null,
        code,
      ),
    );
  }
  private component(id: number): EquipmentComponent {
    const component = this.components.find((item) => item.id === id);
    if (!component)
      throw new EquipmentError(
        "Componente não encontrado neste equipamento",
        "NOT_FOUND",
      );
    return component;
  }
  updateComponent(id: number, data: ComponentData): void {
    this.assertWritable();
    const component = this.component(id);
    const before = component.snapshot();
    component.update(data);
    this.events.push(
      new EquipmentEvent(
        "COMPONENT_UPDATED",
        { before: { ...before }, after: { ...component.snapshot() } },
        null,
        component.code,
      ),
    );
  }
  changeStatus(status: EquipmentStatus, reason: string): void {
    this.assertWritable();
    assertTransition(this.data.status, status);
    const justification = text(reason, "Justificativa", 1000, 3);
    const previous = this.data.status;
    this.data = { ...this.data, status };
    this.events.push(
      new EquipmentEvent(
        "STATUS_CHANGED",
        { resourceName: this.data.name, from: previous, to: status },
        justification,
      ),
    );
  }
  retire(reason: string): void {
    this.changeStatus("RETIRED", reason);
  }
  changeComponentStatus(
    id: number,
    status: EquipmentStatus,
    reason: string,
  ): void {
    this.assertWritable();
    const component = this.component(id);
    const before = component.snapshot();
    const justification = text(reason, "Justificativa", 1000, 3);
    component.changeStatus(status);
    this.events.push(
      new EquipmentEvent(
        "STATUS_CHANGED",
        { resourceName: before.name, from: before.status, to: status },
        justification,
        component.code,
      ),
    );
  }
  scheduleMaintenance(date: CivilDate, reason: string): void {
    this.assertWritable();
    const justification = text(reason, "Justificativa", 1000, 3);
    const before = this.maintenance.snapshot();
    this.maintenance = this.maintenance.schedule(date);
    this.events.push(
      new EquipmentEvent(
        "MAINTENANCE_SCHEDULED",
        { previousDate: before.nextMaintenanceDate, nextDate: date.toString() },
        justification,
      ),
    );
  }
  recordMaintenance(
    performed: CivilDate,
    today: CivilDate,
    reason: string,
    next?: CivilDate,
  ): void {
    this.assertWritable();
    const justification = text(reason, "Justificativa", 1000, 3);
    const before = this.maintenance.snapshot();
    this.maintenance = this.maintenance.record(performed, today, next);
    this.events.push(
      new EquipmentEvent(
        "MAINTENANCE_COMPLETED",
        {
          previousDate: before.lastMaintenanceDate,
          previousNextDate: before.nextMaintenanceDate,
          performedOn: performed.toString(),
          nextDate: this.maintenance.snapshot().nextMaintenanceDate,
        },
        justification,
        null,
        performed.toString(),
      ),
    );
  }
  reviewCompatibility(procedureId: number, active: boolean): void {
    if (active) this.assertWritable();
    this.events.push(
      new EquipmentEvent("PROCEDURE_COMPATIBILITY", { procedureId, active }),
    );
  }
  snapshot(): EquipmentSnapshot {
    return {
      ...this.data,
      ...this.maintenance.snapshot(),
      components: this.components.map((component) => component.snapshot()),
    };
  }
}
