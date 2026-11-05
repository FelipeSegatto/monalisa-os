import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ApplicationError } from "../../shared/domain/application-error";
import { EquipmentCompatibilityPort } from "../application/equipment-compatibility.port";
import { EquipmentAvailability } from "../domain/procedure.types";
/** Cross-domain resource access stays in this adapter; locking follows equipment's existing order. */
@Injectable()
export class EquipmentCompatibilityAdapter extends EquipmentCompatibilityPort {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async availability(procedureId: number): Promise<EquipmentAvailability> {
    const row = await this.db.procedure.findUnique({
      where: { id: procedureId },
      select: {
        equipmentReviewedAt: true,
        equipmentLinks: {
          where: { active: true },
          include: { equipment: { select: { status: true } } },
        },
      },
    });
    if (!row)
      throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
    return {
      reviewed: !!row.equipmentReviewedAt,
      hasActiveCompatible: (row.equipmentLinks ?? []).some(
        (link) => link.equipment.status === "ACTIVE",
      ),
    };
  }
  async locked(
    tx: Prisma.TransactionClient,
    procedureId: number,
    reviewed: boolean,
  ): Promise<EquipmentAvailability> {
    const links = await tx.procedureEquipment.findMany({
      where: { procedureId, active: true },
      select: { equipmentId: true },
    });
    let hasActiveCompatible = false;
    for (const id of links
      .map((link) => link.equipmentId)
      .sort((a, b) => a - b)) {
      const [equipment] = await tx.$queryRaw<
        Array<{ id: number; status: string }>
      >`SELECT id, status FROM Equipment WHERE id = ${id} FOR UPDATE`;
      if (equipment?.status === "ACTIVE") hasActiveCompatible = true;
    }
    return { reviewed, hasActiveCompatible };
  }
}
