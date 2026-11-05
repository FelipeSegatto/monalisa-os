import { Prisma } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { required } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import { ProfessionalCapabilitiesRepository } from "../application/professional-capabilities";
import { WorkingPeriod } from "../../scheduling/domain/working-calendar";
@Injectable()
export class PrismaProfessionalCapabilitiesRepository extends ProfessionalCapabilitiesRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async get(id: number) {
    const p = required(
      await this.db.professional.findUnique({
        where: { id },
        include: { qualifications: true, workingPeriods: true },
      }),
    );
    const ids = p.qualifications
      .filter((q) => q.active)
      .map((q) => q.procedureId);
    const affected = await this.db.appointment.findMany({
      where: {
        professionalId: id,
        startsAt: { gte: new Date() },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        procedureId: { notIn: ids },
      },
      select: { id: true, procedureId: true, startsAt: true },
    });
    return {
      procedureIds: ids,
      priority: p.schedulingPriority,
      workingPeriods: p.workingPeriods.map(
        ({ weekday, startMinute, endMinute }) => ({
          weekday,
          startMinute,
          endMinute,
        }),
      ),
      affectedAppointments: affected,
    };
  }
  async save(
    id: number,
    ids: readonly number[],
    priority: number | null,
    periods: WorkingPeriod[],
    actorId: number,
  ) {
    await this.db.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<
          Array<{ id: number }>
        >`SELECT id FROM Professional WHERE id=${id} FOR UPDATE`;
        if (!locked.length)
          throw new ApplicationError(
            "Profissional não encontrado",
            "NOT_FOUND",
          );
        const procedures = await tx.procedure.findMany({
          where: { id: { in: [...ids] } },
          select: { id: true },
        });
        if (procedures.length !== ids.length)
          throw new ApplicationError(
            "Procedimento não encontrado",
            "INVALID_INPUT",
          );
        const previous = await tx.professionalProcedureQualification.findMany({
          where: { professionalId: id },
        });
        const all = new Set([...previous.map((q) => q.procedureId), ...ids]);
        for (const procedureId of all) {
          const active = ids.includes(procedureId),
            old = previous.find((q) => q.procedureId === procedureId);
          if (old?.active === active) continue;
          await tx.professionalProcedureQualification.upsert({
            where: {
              professionalId_procedureId: { professionalId: id, procedureId },
            },
            create: { professionalId: id, procedureId, active },
            update: { active },
          });
          await tx.qualificationChange.create({
            data: { professionalId: id, procedureId, active, actorId },
          });
        }
        await tx.professional.update({
          where: { id },
          data: { schedulingPriority: priority },
        });
        await tx.professionalWorkingPeriod.deleteMany({
          where: { professionalId: id },
        });
        if (periods.length)
          await tx.professionalWorkingPeriod.createMany({
            data: periods.map((p) => ({ ...p, professionalId: id })),
          });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.get(id);
  }
}
