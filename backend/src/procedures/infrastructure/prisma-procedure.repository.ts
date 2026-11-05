import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ApplicationError } from "../../shared/domain/application-error";
import { Procedure } from "../domain/procedure";
import { ProcedureRepository } from "../domain/procedure.repository";
import { EquipmentAvailability } from "../domain/procedure.types";
import { ProcedureMapper } from "./procedure.mapper";
import { EquipmentCompatibilityAdapter } from "./equipment-compatibility.adapter";
@Injectable()
export class PrismaProcedureRepository extends ProcedureRepository {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(EquipmentCompatibilityAdapter)
    private readonly equipment: EquipmentCompatibilityAdapter,
  ) {
    super();
  }
  private async saveOptions(
    tx: Prisma.TransactionClient,
    procedureId: number,
    procedure: Procedure,
  ) {
    for (const option of procedure.snapshot().options) {
      const { id, ...data } = option;
      if (id === null)
        await tx.procedureVariation.create({ data: { ...data, procedureId } });
      else {
        const result = await tx.procedureVariation.updateMany({
          where: { id, procedureId },
          data,
        });
        if (!result.count)
          throw new ApplicationError(
            "Opção não pertence ao procedimento",
            "INVALID_INPUT",
          );
      }
    }
  }
  async create(procedure: Procedure) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.procedure.create({
        data: ProcedureMapper.fields(procedure),
      });
      await this.saveOptions(tx, row.id, procedure);
      return row.id;
    });
  }
  async updateLocked(
    id: number,
    change: (procedure: Procedure, availability: EquipmentAvailability) => void,
  ) {
    await this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: number }>
      >`SELECT id FROM \`Procedure\` WHERE id = ${id} FOR UPDATE`;
      if (!rows.length)
        throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
      const row = await tx.procedure.findUniqueOrThrow({
        where: { id },
        include: {
          variations: { orderBy: { sortOrder: "asc" } },
          materials: true,
        },
      });
      const procedure = ProcedureMapper.toDomain(row);
      const before = procedure.snapshot();
      const availability = await this.equipment.locked(
        tx,
        id,
        !!row.equipmentReviewedAt,
      );
      change(procedure, availability);
      const after = procedure.snapshot();
      await tx.procedure.update({
        where: { id },
        data: ProcedureMapper.fields(procedure),
      });
      if (JSON.stringify(before.options) !== JSON.stringify(after.options))
        await this.saveOptions(tx, id, procedure);
      if (
        JSON.stringify(before.materials) !== JSON.stringify(after.materials) ||
        before.materialsReviewedAt?.getTime() !==
          after.materialsReviewedAt?.getTime()
      ) {
        // Validate references before replacing links; the transaction rolls back on any failure.
        for (const item of after.materials)
          if (
            !(await tx.stockItem.findUnique({
              where: { id: item.stockItemId },
              select: { id: true },
            }))
          )
            throw new ApplicationError("Insumo não encontrado", "NOT_FOUND");
        await tx.procedureMaterial.deleteMany({ where: { procedureId: id } });
        if (after.materials.length)
          await tx.procedureMaterial.createMany({
            data: after.materials.map((item) => ({ ...item, procedureId: id })),
          });
        await tx.procedure.update({
          where: { id },
          data: { materialsReviewedAt: after.materialsReviewedAt },
        });
      }
    });
  }
}
