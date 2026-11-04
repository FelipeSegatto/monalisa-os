import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { Equipment, EquipmentSnapshot } from "../domain/equipment";
import { EquipmentError } from "../domain/equipment-error";
import { EquipmentRepository } from "../domain/equipment.repository";
import { EquipmentMapper } from "./equipment.mapper";

@Injectable()
export class PrismaEquipmentRepository extends EquipmentRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }

  private async loadLocked(
    tx: Prisma.TransactionClient,
    id: number,
  ): Promise<Equipment> {
    const locked = await tx.$queryRaw<
      Array<{ id: number }>
    >`SELECT id FROM Equipment WHERE id = ${id} FOR UPDATE`;
    if (!locked.length)
      throw new EquipmentError("Equipamento não encontrado", "NOT_FOUND");
    const row = await tx.equipment.findUniqueOrThrow({
      where: { id },
      include: { components: true },
    });
    return EquipmentMapper.toDomain(row);
  }

  private async appendEvents(
    tx: Prisma.TransactionClient,
    id: number,
    equipment: Equipment,
    actorId: number,
    componentIds: Map<string, number>,
  ) {
    for (const event of equipment.pendingEvents) {
      const componentId = event.componentCode
        ? componentIds.get(event.componentCode)
        : undefined;
      if (event.componentCode && componentId === undefined)
        throw new EquipmentError("Componente do evento não foi persistido");
      await tx.equipmentEvent.create({
        data: {
          equipmentId: id,
          componentId,
          actorId,
          type: event.type,
          reason: event.reason,
          occurredOn: event.occurredOn ? new Date(event.occurredOn) : null,
          details: event.details,
        },
      });
    }
  }

  private async save(
    tx: Prisma.TransactionClient,
    id: number,
    equipment: Equipment,
    actorId: number,
    before?: EquipmentSnapshot,
  ) {
    const after = equipment.snapshot();
    const {
      id: _afterId,
      components: _afterComponents,
      ...afterFields
    } = after;
    if (before) {
      const {
        id: _beforeId,
        components: _beforeComponents,
        ...beforeFields
      } = before;
      if (JSON.stringify(beforeFields) !== JSON.stringify(afterFields)) {
        await tx.equipment.update({
          where: { id },
          data: EquipmentMapper.fields(equipment),
        });
      }
    }
    const previous = new Map(
      before?.components.map((component) => [component.code, component]) ?? [],
    );
    const componentIds = new Map<string, number>();
    for (const component of after.components) {
      const { id: componentId, ...data } = component;
      if (
        componentId !== null &&
        JSON.stringify(previous.get(component.code)) ===
          JSON.stringify(component)
      ) {
        componentIds.set(component.code, componentId);
        continue;
      }
      const row =
        componentId === null
          ? await tx.equipmentComponent.create({
              data: { ...data, equipmentId: id },
            })
          : await tx.equipmentComponent.update({
              where: { id: componentId },
              data,
            });
      componentIds.set(row.code, row.id);
    }
    await this.appendEvents(tx, id, equipment, actorId, componentIds);
  }

  async create(equipment: Equipment, actorId: number): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const row = await tx.equipment.create({
        data: EquipmentMapper.fields(equipment),
      });
      await this.save(tx, row.id, equipment, actorId);
      return row.id;
    });
  }

  async updateLocked(
    id: number,
    actorId: number,
    change: (equipment: Equipment) => void,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const equipment = await this.loadLocked(tx, id);
      const before = equipment.snapshot();
      change(equipment);
      await this.save(tx, id, equipment, actorId, before);
    });
  }

  async reviseProcedureResources(
    procedureId: number,
    ids: readonly number[],
    actorId: number,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: number }>
      >`SELECT id FROM \`Procedure\` WHERE id = ${procedureId} FOR UPDATE`;
      if (!rows.length)
        throw new EquipmentError("Registro não encontrado", "NOT_FOUND");
      const previous = await tx.procedureEquipment.findMany({
        where: { procedureId, active: true },
      });
      const affected = [
        ...new Set([...ids, ...previous.map((link) => link.equipmentId)]),
      ].sort((a, b) => a - b);
      const aggregates = new Map<number, Equipment>();
      for (const id of affected) {
        const equipment = await this.loadLocked(tx, id);
        equipment.reviewCompatibility(procedureId, ids.includes(id));
        aggregates.set(id, equipment);
      }
      await tx.procedureEquipment.updateMany({
        where: { procedureId },
        data: { active: false },
      });
      for (const equipmentId of ids)
        await tx.procedureEquipment.upsert({
          where: { procedureId_equipmentId: { procedureId, equipmentId } },
          create: { procedureId, equipmentId },
          update: { active: true },
        });
      await tx.procedure.update({
        where: { id: procedureId },
        data: {
          equipmentReviewedAt: new Date(),
          equipmentReviewedById: actorId,
        },
      });
      for (const [id, equipment] of aggregates)
        await this.appendEvents(tx, id, equipment, actorId, new Map());
    });
  }
}
