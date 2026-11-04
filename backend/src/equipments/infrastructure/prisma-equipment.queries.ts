import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { EquipmentQueries } from "../application/equipment.queries";
import { EquipmentClock } from "../application/equipment-clock";
import { EquipmentError } from "../domain/equipment-error";
import { EquipmentMapper } from "./equipment.mapper";
@Injectable()
export class PrismaEquipmentQueries extends EquipmentQueries {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(EquipmentClock) private readonly clock: EquipmentClock,
  ) {
    super();
  }
  async list() {
    const rows = await this.db.equipment.findMany({
      include: { components: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    return {
      equipment: rows.map((row) =>
        EquipmentMapper.toView(row, this.clock.today()),
      ),
    };
  }
  async detail(id: number) {
    const row = await this.db.equipment.findUnique({
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
    });
    if (!row) throw new EquipmentError("Registro não encontrado", "NOT_FOUND");
    return EquipmentMapper.toView(row, this.clock.today());
  }
  async history(id: number, before?: number) {
    if (
      !(await this.db.equipment.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new EquipmentError("Registro não encontrado", "NOT_FOUND");
    return {
      events: await this.db.equipmentEvent.findMany({
        where: { equipmentId: id, ...(before ? { id: { lt: before } } : {}) },
        orderBy: { id: "desc" },
        take: 100,
        include: { actor: { select: { id: true, name: true } } },
      }),
    };
  }
  async procedureResources(procedureId: number) {
    const row = await this.db.procedure.findUnique({
      where: { id: procedureId },
      select: {
        equipmentReviewedAt: true,
        materialsReviewedAt: true,
        equipmentLinks: {
          where: { active: true },
          include: { equipment: { include: { components: true } } },
        },
      },
    });
    if (!row) throw new EquipmentError("Registro não encontrado", "NOT_FOUND");
    return {
      reviewedAt: row.equipmentReviewedAt,
      materialsReviewedAt: row.materialsReviewedAt,
      equipment: row.equipmentLinks.map((link) =>
        EquipmentMapper.toView(link.equipment, this.clock.today()),
      ),
    };
  }
}
