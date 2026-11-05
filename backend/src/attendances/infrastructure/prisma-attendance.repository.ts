import { PrismaSessionLedger } from "../../commercial/infrastructure/prisma-session-ledger";
import { Prisma } from "@prisma/client";
import { ProcedureExecution } from "../domain/procedure-execution";
import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Actor } from "../../auth/domain/actor";
import { PrismaService } from "../../common/prisma.service";
import { required } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import { ProcedureQualifications } from "../../professionals/domain/procedure-qualifications";
import { PrismaShotLedger } from "../../shot-ledger/infrastructure/prisma-shot-ledger";
import { Attendance, ExecutionInput } from "../domain/attendance";
import { AttendanceRepository } from "../application/attendance.repository";
const include = {
  executions: { include: { materials: true, shots: true } },
} as const;
@Injectable()
export class PrismaAttendanceRepository extends AttendanceRepository {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PrismaShotLedger) private readonly shots: PrismaShotLedger,
    @Inject(PrismaSessionLedger) private readonly sessions: PrismaSessionLedger,
  ) {
    super();
  }
  private authorize(professionalId: number, actor: Actor) {
    if (actor.role !== "ADMIN" && actor.professionalId !== professionalId)
      throw new ApplicationError(
        "Atendimento pertence a outro profissional",
        "FORBIDDEN",
      );
  }
  async detail(id: number, actor: Actor) {
    const a = required(
      await this.db.attendance.findUnique({ where: { id }, include }),
    );
    this.authorize(a.professionalId, actor);
    return a;
  }
  async start(appointmentId: number, actor: Actor) {
    const before = required(
      await this.db.appointment.findUnique({ where: { id: appointmentId } }),
    );
    this.authorize(before.professionalId, actor);
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Professional WHERE id=${before.professionalId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM Appointment WHERE id=${appointmentId} FOR UPDATE`;
        const a = required(
          await tx.appointment.findUnique({ where: { id: appointmentId } }),
        );
        this.authorize(a.professionalId, actor);
        if (a.professionalId !== before.professionalId)
          throw new ApplicationError(
            "Reserva alterada; atualize a agenda",
            "CONFLICT",
          );
        const existing = await tx.attendance.findUnique({
          where: { appointmentId },
          include,
        });
        if (existing) return existing;
        if (a.status !== "CONFIRMED")
          throw new ApplicationError(
            "Confirme o agendamento antes de iniciar o atendimento",
            "CONFLICT",
          );
        const pro = required(
          await tx.professional.findUnique({
            where: { id: a.professionalId },
            include: { qualifications: { where: { active: true } } },
          }),
        );
        if (!pro.active)
          throw new ApplicationError("Profissional inativo", "CONFLICT");
        new ProcedureQualifications(
          pro.qualifications.map((q) => q.procedureId),
        ).assertQualified(a.procedureId);
        const proc = required(
          await tx.procedure.findUnique({ where: { id: a.procedureId } }),
        );
        if (!proc.active)
          throw new ApplicationError("Procedimento inativo", "CONFLICT");
        return tx.attendance.create({
          data: {
            appointmentId,
            customerId: a.customerId,
            professionalId: a.professionalId,
            startedById: actor.id,
          },
          include,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  async cancel(id: number, reason: string, actor: Actor) {
    const before = required(
      await this.db.attendance.findUnique({ where: { id } }),
    );
    this.authorize(before.professionalId, actor);
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Professional WHERE id=${before.professionalId} FOR UPDATE`;
        if (before.appointmentId)
          await tx.$queryRaw`SELECT id FROM Appointment WHERE id=${before.appointmentId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM Attendance WHERE id=${id} FOR UPDATE`;
        const a = required(await tx.attendance.findUnique({ where: { id } }));
        this.authorize(a.professionalId, actor);
        if (a.status === "CANCELLED" && a.cancellationReason === reason.trim())
          return a;
        const cancellationReason = new Attendance(a.startedAt, a.status).cancel(
          reason,
        );
        const result = await tx.attendance.update({
          where: { id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason,
            cancelledById: actor.id,
          },
        });
        if (a.appointmentId)
          await tx.appointment.update({
            where: { id: a.appointmentId },
            data: { status: "CANCELLED" },
          });
        if (a.appointmentId)
          await this.sessions.release(
            tx,
            a.appointmentId,
            actor.id,
            "Atendimento cancelado",
          );
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  async complete(
    id: number,
    input: {
      requestKey: string;
      completedAt?: string;
      executions: ExecutionInput[];
    },
    actor: Actor,
  ) {
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          executions: input.executions,
          completedAt: input.completedAt ?? null,
        }),
      )
      .digest("hex");
    const before = required(
      await this.db.attendance.findUnique({ where: { id } }),
    );
    this.authorize(before.professionalId, actor);
    return this.db.$transaction(
      async (tx) => {
        const proIds = [
          ...new Set([
            before.professionalId,
            ...input.executions.map((e) => e.professionalId),
          ]),
        ].sort((a, b) => a - b);
        for (const p of proIds)
          await tx.$queryRaw`SELECT id FROM Professional WHERE id=${p} FOR UPDATE`;
        const procIds = [
          ...new Set(input.executions.map((e) => e.procedureId)),
        ].sort((a, b) => a - b);
        for (const p of procIds)
          await tx.$queryRaw`SELECT id FROM \`Procedure\` WHERE id=${p} FOR UPDATE`;
        if (before.appointmentId)
          await tx.$queryRaw`SELECT id FROM Appointment WHERE id=${before.appointmentId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM Attendance WHERE id=${id} FOR UPDATE`;
        const a = required(await tx.attendance.findUnique({ where: { id } }));
        this.authorize(a.professionalId, actor);
        if (a.status === "COMPLETED") {
          if (a.completionKey === input.requestKey && a.completionHash === hash)
            return tx.attendance.findUniqueOrThrow({ where: { id }, include });
          throw new ApplicationError(
            "Atendimento já concluído com outro conteúdo",
            "CONFLICT",
          );
        }
        const end = input.completedAt
          ? new Date(input.completedAt)
          : new Date();
        new Attendance(a.startedAt, a.status).complete(input.executions, end);
        if (a.appointmentId) {
          const ap = required(
            await tx.appointment.findUnique({ where: { id: a.appointmentId } }),
          );
          if (ap.status !== "CONFIRMED")
            throw new ApplicationError(
              "Agendamento não está confirmado",
              "CONFLICT",
            );
          if (!input.executions.some((e) => e.procedureId === ap.procedureId))
            throw new ApplicationError(
              "Inclua o procedimento agendado",
              "INVALID_INPUT",
            );
        }
        const eqIds = [
          ...new Set(
            input.executions.flatMap((e) =>
              e.equipmentId ? [e.equipmentId] : [],
            ),
          ),
        ].sort((a, b) => a - b);
        for (const eq of eqIds)
          await tx.$queryRaw`SELECT id FROM Equipment WHERE id=${eq} FOR UPDATE`;
        const materialIds = [
          ...new Set(
            input.executions.flatMap((e) =>
              e.materials.map((m) => m.stockItemId),
            ),
          ),
        ].sort((a, b) => a - b);
        for (const material of materialIds)
          await tx.$queryRaw`SELECT id FROM StockItem WHERE id=${material} FOR UPDATE`;
        const hold = a.appointmentId
          ? await tx.sessionReservation.findUnique({
              where: { appointmentId: a.appointmentId },
              include: { entitlement: true },
            })
          : null;
        let reservedConsumed = false;
        const rights = [
          ...input.executions.flatMap((e) =>
            e.entitlementId ? [e.entitlementId] : [],
          ),
          ...(hold?.status === "ACTIVE" ? [hold.entitlementId] : []),
        ];
        if (rights.length) await this.sessions.lock(tx, rights);
        for (let index = 0; index < input.executions.length; index++) {
          const e = input.executions[index];
          this.authorize(e.professionalId, actor);
          const pro = required(
            await tx.professional.findUnique({
              where: { id: e.professionalId },
              include: { qualifications: { where: { active: true } } },
            }),
          );
          if (!pro.active)
            throw new ApplicationError("Profissional inativo", "CONFLICT");
          new ProcedureQualifications(
            pro.qualifications.map((q) => q.procedureId),
          ).assertQualified(e.procedureId);
          const proc = required(
            await tx.procedure.findUnique({ where: { id: e.procedureId } }),
          );
          const variation = e.variationId
            ? required(
                await tx.procedureVariation.findUnique({
                  where: { id: e.variationId },
                }),
              )
            : null;
          const eq = e.equipmentId
            ? required(
                await tx.equipment.findUnique({ where: { id: e.equipmentId } }),
              )
            : null;
          const link = eq
            ? await tx.procedureEquipment.findUnique({
                where: {
                  procedureId_equipmentId: {
                    procedureId: proc.id,
                    equipmentId: eq.id,
                  },
                },
              })
            : null;
          const expected = await tx.procedureMaterial.findMany({
            where: { procedureId: proc.id },
          });
          const materials = await tx.stockItem.findMany({
            where: { id: { in: e.materials.map((m) => m.stockItemId) } },
          });
          const recorded = ProcedureExecution.record(e, {
            procedure: proc,
            variation,
            equipment: eq ? { ...eq, compatible: link?.active ?? false } : null,
            expectedMaterialIds: expected.map((m) => m.stockItemId),
            materials,
          }).snapshot();
          const { materials: usages, ...fields } = recorded;
          const execution = await tx.procedureExecution.create({
            data: {
              attendanceId: id,
              ...fields,
              materials: { create: usages },
            },
          });
          const entitlementId =
            e.entitlementId ??
            (!reservedConsumed &&
            hold?.status === "ACTIVE" &&
            hold.entitlement.procedureId === e.procedureId &&
            hold.entitlement.variationId === (e.variationId ?? null)
              ? hold.entitlementId
              : null);
          if (entitlementId && entitlementId === hold?.entitlementId)
            reservedConsumed = true;
          if (entitlementId)
            await this.sessions.redeem(
              tx,
              entitlementId,
              execution.id,
              {
                customerId: a.customerId,
                procedureId: e.procedureId,
                variationId: e.variationId ?? null,
                at: end,
                appointmentId: a.appointmentId,
              },
              actor.id,
              `${input.requestKey}:session:${index}`,
            );
          for (let j = 0; j < e.shots.length; j++) {
            const shot = e.shots[j];
            await this.shots.append(tx, {
              equipmentId: e.equipmentId!,
              componentId: shot.componentId ?? null,
              executionId: execution.id,
              type: "CONSUMPTION",
              quantityDelta: shot.quantity,
              actorId: actor.id,
              requestKey: `${input.requestKey}:${index}:${j}`,
            });
          }
        }
        if (a.appointmentId && hold?.status === "ACTIVE") {
          const settled = await tx.sessionReservation.findUnique({
            where: { appointmentId: a.appointmentId },
          });
          if (settled?.status === "ACTIVE")
            throw new ApplicationError(
              "A execução deve utilizar a sessão reservada; confira a área/opção",
              "CONFLICT",
            );
        }
        await tx.attendance.update({
          where: { id },
          data: {
            status: "COMPLETED",
            completedById: actor.id,
            completedAt: end,
            completionKey: input.requestKey,
            completionHash: hash,
          },
        });
        if (a.appointmentId)
          await tx.appointment.update({
            where: { id: a.appointmentId },
            data: { status: "COMPLETED" },
          });
        return tx.attendance.findUniqueOrThrow({ where: { id }, include });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 15000,
      },
    );
  }
}
