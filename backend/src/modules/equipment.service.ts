import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PrismaService } from "../common/prisma.service";
import { dateKey, required } from "../common/util";
import {
  addCalendarMonths,
  maintenanceState,
} from "../domain/equipment-policy";
import { equipmentInput, componentInput } from "./equipment.inputs";

type EquipmentData = z.infer<typeof equipmentInput>;
type ComponentData = z.infer<typeof componentInput>;
type Status = "ACTIVE" | "MAINTENANCE" | "RETIRED";
const dateOnly = (date: Date | null) =>
  date?.toISOString().slice(0, 10) ?? null;

@Injectable()
export class EquipmentService {
  constructor(private readonly db: PrismaService) {}

  private async lock(tx: Prisma.TransactionClient, id: number) {
    required(
      (
        await tx.$queryRaw<
          Array<{ id: number }>
        >`SELECT id FROM Equipment WHERE id = ${id} FOR UPDATE`
      )[0],
      "Equipamento não encontrado",
    );
    return tx.equipment.findUniqueOrThrow({ where: { id } });
  }
  private writable(status: Status) {
    if (status === "RETIRED")
      throw new ConflictException(
        "Equipamento aposentado: histórico preservado, sem novas alterações",
      );
  }
  private summary<
    T extends {
      status: Status;
      lastMaintenanceDate: Date | null;
      nextMaintenanceDate: Date | null;
    },
  >(equipment: T) {
    const nextMaintenanceDate = dateOnly(equipment.nextMaintenanceDate);
    return {
      ...equipment,
      lastMaintenanceDate: dateOnly(equipment.lastMaintenanceDate),
      nextMaintenanceDate,
      maintenanceState: maintenanceState(
        equipment.status,
        nextMaintenanceDate,
        dateKey(new Date()),
      ),
    };
  }
  async list() {
    const items = await this.db.equipment.findMany({
      include: { components: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    return { equipment: items.map((item) => this.summary(item)) };
  }
  async detail(id: number) {
    const item = required(
      await this.db.equipment.findUnique({
        where: { id },
        include: {
          components: { orderBy: { name: "asc" } },
          procedures: {
            where: { active: true },
            include: { procedure: { select: { id: true, name: true } } },
          },
          events: {
            orderBy: { id: "desc" },
            take: 100,
            include: { actor: { select: { id: true, name: true } } },
          },
        },
      }),
    );
    return this.summary(item);
  }
  async history(id: number, before?: number) {
    required(
      await this.db.equipment.findUnique({
        where: { id },
        select: { id: true },
      }),
    );
    return {
      events: await this.db.equipmentEvent.findMany({
        where: { equipmentId: id, ...(before ? { id: { lt: before } } : {}) },
        orderBy: { id: "desc" },
        take: 100,
        include: { actor: { select: { id: true, name: true } } },
      }),
    };
  }
  async create(data: EquipmentData, actorId: number) {
    const item = await this.db.equipment.create({
      data: {
        ...data,
        code: `EQ-${randomUUID()}`,
        events: {
          create: { actorId, type: "CREATED", details: data },
        },
      },
    });
    return this.detail(item.id);
  }
  async update(id: number, data: EquipmentData, actorId: number) {
    await this.db.$transaction(async (tx) => {
      const before = await this.lock(tx, id);
      this.writable(before.status);
      await tx.equipment.update({ where: { id }, data });
      await tx.equipmentEvent.create({
        data: {
          equipmentId: id,
          actorId,
          type: "UPDATED",
          details: { before: JSON.parse(JSON.stringify(before)), after: data },
        },
      });
    });
    return this.detail(id);
  }
  async component(id: number, data: ComponentData, actorId: number) {
    await this.db.$transaction(async (tx) => {
      const equipment = await this.lock(tx, id);
      this.writable(equipment.status);
      const item = await tx.equipmentComponent.create({
        data: { ...data, equipmentId: id, code: `COMP-${randomUUID()}` },
      });
      await tx.equipmentEvent.create({
        data: {
          equipmentId: id,
          componentId: item.id,
          actorId,
          type: "COMPONENT_CREATED",
          details: data,
        },
      });
    });
    return this.detail(id);
  }
  async updateComponent(
    id: number,
    componentId: number,
    data: ComponentData,
    actorId: number,
  ) {
    await this.db.$transaction(async (tx) => {
      const equipment = await this.lock(tx, id);
      this.writable(equipment.status);
      const before = required(
        await tx.equipmentComponent.findFirst({
          where: { id: componentId, equipmentId: id },
        }),
      );
      if (before.status === "RETIRED")
        throw new ConflictException("Componente aposentado");
      await tx.equipmentComponent.update({ where: { id: componentId }, data });
      await tx.equipmentEvent.create({
        data: {
          equipmentId: id,
          componentId,
          actorId,
          type: "COMPONENT_UPDATED",
          details: { before: JSON.parse(JSON.stringify(before)), after: data },
        },
      });
    });
    return this.detail(id);
  }
  async status(
    id: number,
    status: Status,
    reason: string,
    actorId: number,
    componentId?: number,
  ) {
    await this.db.$transaction(async (tx) => {
      const equipment = await this.lock(tx, id);
      this.writable(equipment.status);
      const target =
        componentId === undefined
          ? equipment
          : required(
              await tx.equipmentComponent.findFirst({
                where: { id: componentId, equipmentId: id },
              }),
            );
      if (target.status === "RETIRED")
        throw new ConflictException("Recurso aposentado");
      if (target.status === status)
        throw new ConflictException("Recurso já está nessa situação");
      if (componentId === undefined)
        await tx.equipment.update({ where: { id }, data: { status } });
      else
        await tx.equipmentComponent.update({
          where: { id: componentId },
          data: { status },
        });
      await tx.equipmentEvent.create({
        data: {
          equipmentId: id,
          componentId,
          actorId,
          type: "STATUS_CHANGED",
          reason,
          details: {
            resourceName: target.name,
            from: target.status,
            to: status,
          },
        },
      });
    });
    return this.detail(id);
  }
  async schedule(
    id: number,
    nextDate: string,
    reason: string,
    actorId: number,
  ) {
    await this.db.$transaction(async (tx) => {
      const before = await this.lock(tx, id);
      this.writable(before.status);
      if (
        before.lastMaintenanceDate &&
        nextDate <= dateOnly(before.lastMaintenanceDate)!
      )
        throw new BadRequestException(
          "Próxima manutenção deve ser posterior à última",
        );
      await tx.equipment.update({
        where: { id },
        data: { nextMaintenanceDate: new Date(nextDate) },
      });
      await tx.equipmentEvent.create({
        data: {
          equipmentId: id,
          actorId,
          type: "MAINTENANCE_SCHEDULED",
          reason,
          details: {
            previousDate: dateOnly(before.nextMaintenanceDate),
            nextDate,
          },
        },
      });
    });
    return this.detail(id);
  }
  async maintenance(
    id: number,
    performedOn: string,
    nextDate: string | undefined,
    reason: string,
    actorId: number,
  ) {
    if (performedOn > dateKey(new Date()))
      throw new BadRequestException(
        "Manutenção realizada não pode estar no futuro",
      );
    await this.db.$transaction(async (tx) => {
      const before = await this.lock(tx, id);
      this.writable(before.status);
      if (
        before.lastMaintenanceDate &&
        performedOn <= dateOnly(before.lastMaintenanceDate)!
      )
        throw new ConflictException(
          "Já existe manutenção nessa data ou em data posterior",
        );
      const next =
        nextDate ??
        addCalendarMonths(performedOn, before.maintenanceIntervalMonths);
      if (next <= performedOn)
        throw new BadRequestException(
          "Próxima manutenção deve ser posterior à realizada",
        );
      await tx.equipment.update({
        where: { id },
        data: {
          lastMaintenanceDate: new Date(performedOn),
          nextMaintenanceDate: new Date(next),
        },
      });
      await tx.equipmentEvent.create({
        data: {
          equipmentId: id,
          actorId,
          type: "MAINTENANCE_COMPLETED",
          occurredOn: new Date(performedOn),
          reason,
          details: {
            previousDate: dateOnly(before.lastMaintenanceDate),
            previousNextDate: dateOnly(before.nextMaintenanceDate),
            performedOn,
            nextDate: next,
          },
        },
      });
    });
    return this.detail(id);
  }
  async procedureResources(procedureId: number) {
    const procedure = required(
      await this.db.procedure.findUnique({
        where: { id: procedureId },
        select: {
          equipmentReviewedAt: true,
          materialsReviewedAt: true,
          equipmentLinks: {
            where: { active: true },
            include: { equipment: { include: { components: true } } },
          },
        },
      }),
    );
    return {
      reviewedAt: procedure.equipmentReviewedAt,
      materialsReviewedAt: procedure.materialsReviewedAt,
      equipment: procedure.equipmentLinks.map((link) =>
        this.summary(link.equipment),
      ),
    };
  }
  async setProcedureResources(
    procedureId: number,
    ids: number[],
    actorId: number,
  ) {
    await this.db.$transaction(async (tx) => {
      required(
        (
          await tx.$queryRaw<
            Array<{ id: number }>
          >`SELECT id FROM \`Procedure\` WHERE id = ${procedureId} FOR UPDATE`
        )[0],
      );
      const previous = await tx.procedureEquipment.findMany({
        where: { procedureId, active: true },
      });
      // Stable lock order also serializes compatibility edits with retirement.
      const affected = [
        ...new Set([...ids, ...previous.map((p) => p.equipmentId)]),
      ].sort((a, b) => a - b);
      for (const id of affected) {
        const item = await this.lock(tx, id);
        if (ids.includes(id)) this.writable(item.status);
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
      for (const equipmentId of new Set([
        ...previous.map((p) => p.equipmentId),
        ...ids,
      ])) {
        await tx.equipmentEvent.create({
          data: {
            equipmentId,
            actorId,
            type: "PROCEDURE_COMPATIBILITY",
            details: { procedureId, active: ids.includes(equipmentId) },
          },
        });
      }
    });
    return this.procedureResources(procedureId);
  }
}
