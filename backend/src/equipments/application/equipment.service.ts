import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CivilDate } from "../domain/civil-date";
import { Equipment } from "../domain/equipment";
import { EquipmentError } from "../domain/equipment-error";
import { EquipmentRepository } from "../domain/equipment.repository";
import {
  EquipmentData,
  ComponentData,
  EquipmentStatus,
} from "../domain/equipment.types";
import { EquipmentClock } from "./equipment-clock";
import { EquipmentQueries } from "./equipment.queries";

@Injectable()
export class EquipmentService {
  constructor(
    @Inject(EquipmentRepository)
    private readonly repository: EquipmentRepository,
    @Inject(EquipmentQueries) private readonly queries: EquipmentQueries,
    @Inject(EquipmentClock) private readonly clock: EquipmentClock,
  ) {}

  list() {
    return this.queries.list();
  }
  detail(id: number) {
    return this.queries.detail(id);
  }
  history(id: number, before?: number) {
    return this.queries.history(id, before);
  }
  procedureResources(id: number) {
    return this.queries.procedureResources(id);
  }

  async create(data: EquipmentData, actorId: number) {
    const equipment = Equipment.create(`EQ-${randomUUID()}`, data);
    const id = await this.repository.create(equipment, actorId);
    return this.queries.detail(id);
  }
  private async change(
    id: number,
    actorId: number,
    action: (equipment: Equipment) => void,
  ) {
    await this.repository.updateLocked(id, actorId, action);
    return this.queries.detail(id);
  }
  update(id: number, data: EquipmentData, actorId: number) {
    return this.change(id, actorId, (equipment) => equipment.update(data));
  }
  component(id: number, data: ComponentData, actorId: number) {
    return this.change(id, actorId, (equipment) =>
      equipment.addComponent(`COMP-${randomUUID()}`, data),
    );
  }
  updateComponent(
    id: number,
    componentId: number,
    data: ComponentData,
    actorId: number,
  ) {
    return this.change(id, actorId, (equipment) =>
      equipment.updateComponent(componentId, data),
    );
  }
  status(
    id: number,
    status: EquipmentStatus,
    reason: string,
    actorId: number,
    componentId?: number,
  ) {
    return this.change(id, actorId, (equipment) => {
      if (componentId !== undefined)
        equipment.changeComponentStatus(componentId, status, reason);
      else if (status === "RETIRED") equipment.retire(reason);
      else equipment.changeStatus(status, reason);
    });
  }
  schedule(id: number, nextDate: string, reason: string, actorId: number) {
    const date = CivilDate.from(nextDate);
    return this.change(id, actorId, (equipment) =>
      equipment.scheduleMaintenance(date, reason),
    );
  }
  maintenance(
    id: number,
    performedOn: string,
    nextDate: string | undefined,
    reason: string,
    actorId: number,
  ) {
    const performed = CivilDate.from(performedOn),
      next = nextDate ? CivilDate.from(nextDate) : undefined,
      today = this.clock.today();
    return this.change(id, actorId, (equipment) =>
      equipment.recordMaintenance(performed, today, reason, next),
    );
  }
  async setProcedureResources(
    procedureId: number,
    ids: number[],
    actorId: number,
  ) {
    if (
      new Set(ids).size !== ids.length ||
      ids.length > 100 ||
      ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
    )
      throw new EquipmentError("Equipamentos inválidos ou duplicados");
    await this.repository.reviseProcedureResources(procedureId, ids, actorId);
    return this.queries.procedureResources(procedureId);
  }
}
