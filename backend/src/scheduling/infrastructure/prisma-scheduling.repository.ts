import { PrismaSessionLedger } from "../../commercial/infrastructure/prisma-session-ledger";
import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Actor } from "../../auth/domain/actor";
import { PrismaService } from "../../common/prisma.service";
import { required, dayRange, dateKey } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import { ProcedureQualifications } from "../../professionals/domain/procedure-qualifications";
import { validInterval } from "../../domain/appointment-policy";
import { WorkingCalendar } from "../domain/working-calendar";
import { assignmentPolicy } from "../domain/assignment-policy";
import {
  SchedulingRepository,
  ReservationInput,
} from "../application/scheduling.repository";
export const occupiedWhere = (
  now = new Date(),
): Prisma.AppointmentWhereInput => ({
  status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
  OR: [
    { expiresAt: null },
    { expiresAt: { gt: now } },
    { status: { not: "SCHEDULED" } },
  ],
});
@Injectable()
export class PrismaSchedulingRepository extends SchedulingRepository {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PrismaSessionLedger) private readonly sessions: PrismaSessionLedger,
  ) {
    super();
  }
  async settings() {
    const settings = (await this.db.schedulingSettings.findUnique({
      where: { id: 1 },
    })) ?? {
      assignmentPolicy: "PRIORITY",
      confirmationMode: "MANUAL",
      holdMinutes: 1440,
    };
    return {
      assignmentPolicy: settings.assignmentPolicy,
      confirmationMode: settings.confirmationMode,
      holdMinutes: settings.holdMinutes,
    };
  }
  async saveSettings(input: {
    assignmentPolicy: string;
    confirmationMode: string;
    holdMinutes: number;
  }) {
    assignmentPolicy(input.assignmentPolicy);
    await this.db.schedulingSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...input },
      update: input,
    });
    return this.settings();
  }
  private interval(start: Date, minutes: number) {
    const end = new Date(+start + minutes * 60000);
    if (
      !Number.isInteger(minutes) ||
      !validInterval({ start, end }) ||
      start.getSeconds() ||
      start.getMilliseconds()
    )
      throw new ApplicationError(
        "Intervalo inválido: use minutos completos e duração de até 12 horas",
        "INVALID_INPUT",
      );
    return end;
  }
  private async eligible(
    tx: Prisma.TransactionClient,
    procedureId: number,
    start: Date,
    end: Date,
    professionalId?: number,
    excludeId?: number,
  ) {
    const pros = await tx.professional.findMany({
      where: {
        active: true,
        ...(professionalId ? { id: professionalId } : {}),
      },
      include: {
        qualifications: { where: { active: true } },
        workingPeriods: true,
      },
      orderBy: { id: "asc" },
    });
    const result: typeof pros = [];
    for (const p of pros) {
      try {
        new ProcedureQualifications(
          p.qualifications.map((q) => q.procedureId),
        ).assertQualified(procedureId);
      } catch {
        continue;
      }
      if (!new WorkingCalendar(p.workingPeriods).includes(start, end)) continue;
      const busy = await tx.appointment.findFirst({
        where: {
          ...occupiedWhere(),
          professionalId: p.id,
          startsAt: { lt: end },
          endsAt: { gt: start },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      const blocked = await tx.agendaBlock.findFirst({
        where: {
          professionalId: p.id,
          startsAt: { lt: end },
          endsAt: { gt: start },
        },
      });
      if (!busy && !blocked) result.push(p);
    }
    return result;
  }
  private async equipment(
    tx: Prisma.TransactionClient,
    proc: {
      id: number;
      requiresEquipment: boolean;
      equipmentReviewedAt: Date | null;
    },
    start: Date,
    end: Date,
    excludeId?: number,
    lock = false,
  ) {
    if (!proc.requiresEquipment) return null;
    if (!proc.equipmentReviewedAt)
      throw new ApplicationError(
        "Compatibilidade de equipamento não revisada",
        "CONFLICT",
      );
    const links = await tx.procedureEquipment.findMany({
      where: { procedureId: proc.id, active: true },
      orderBy: { equipmentId: "asc" },
    });
    if (lock)
      for (const l of links)
        await tx.$queryRaw`SELECT id FROM Equipment WHERE id=${l.equipmentId} FOR UPDATE`;
    for (const link of links) {
      const eq = await tx.equipment.findUnique({
        where: { id: link.equipmentId },
      });
      if (eq?.status !== "ACTIVE") continue;
      const busy = await tx.appointment.findFirst({
        where: {
          ...occupiedWhere(),
          AND: [
            {
              OR: [
                { equipmentId: eq.id },
                {
                  equipmentId: null,
                  procedure: {
                    requiresEquipment: true,
                    equipmentLinks: {
                      some: { equipmentId: eq.id, active: true },
                    },
                  },
                },
              ],
            },
          ],
          startsAt: { lt: end },
          endsAt: { gt: start },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (!busy) return eq.id;
    }
    throw new ApplicationError(
      "Nenhum equipamento compatível disponível no intervalo",
      "CONFLICT",
    );
  }
  async available(
    procedureId: number,
    start: Date,
    duration?: number,
    excludeId?: number,
  ) {
    const proc = required(
      await this.db.procedure.findUnique({ where: { id: procedureId } }),
    );
    if (!proc.active) return [];
    const end = this.interval(start, duration ?? proc.durationMinutes);
    try {
      await this.equipment(this.db, proc, start, end, excludeId);
    } catch (e) {
      if (e instanceof ApplicationError && e.category === "CONFLICT") return [];
      throw e;
    }
    return (
      await this.eligible(
        this.db,
        procedureId,
        start,
        end,
        undefined,
        excludeId,
      )
    ).map(({ id, name, color }) => ({ id, name, color }));
  }
  async dailySlots(procedureId: number, date: string) {
    const proc = required(
      await this.db.procedure.findUnique({ where: { id: procedureId } }),
    );
    const settings = await this.settings();
    if (
      !proc.active ||
      settings.assignmentPolicy === "MANUAL" ||
      (proc.requiresEquipment && !proc.equipmentReviewedAt)
    )
      return [];
    const start = new Date(date + "T00:00:00-03:00"),
      end = new Date(+start + 86400000);
    const [pros, equipments, appointments, blocks] = await Promise.all([
      this.db.professional.findMany({
        where: {
          active: true,
          ...(settings.assignmentPolicy === "PRIORITY"
            ? { schedulingPriority: { not: null } }
            : {}),
          qualifications: { some: { procedureId, active: true } },
        },
        include: { workingPeriods: true },
      }),
      proc.requiresEquipment
        ? this.db.equipment.findMany({
            where: {
              status: "ACTIVE",
              procedures: { some: { procedureId, active: true } },
            },
          })
        : Promise.resolve([]),
      this.db.appointment.findMany({
        where: {
          ...occupiedWhere(),
          startsAt: { lt: end },
          endsAt: { gt: start },
        },
        include: {
          procedure: {
            select: {
              requiresEquipment: true,
              equipmentLinks: {
                where: { active: true },
                select: { equipmentId: true },
              },
            },
          },
        },
      }),
      this.db.agendaBlock.findMany({
        where: { startsAt: { lt: end }, endsAt: { gt: start } },
      }),
    ]);
    const slots: string[] = [];
    for (let minute = 0; minute < 1440; minute += 30) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const s = new Date(date + "T" + time + ":00-03:00"),
        e = new Date(+s + proc.durationMinutes * 60000);
      if (s <= new Date()) continue;
      if (
        !pros.some(
          (p) =>
            new WorkingCalendar(p.workingPeriods).includes(s, e) &&
            !appointments.some(
              (a) =>
                a.professionalId === p.id && a.startsAt < e && a.endsAt > s,
            ) &&
            !blocks.some(
              (b) =>
                b.professionalId === p.id && b.startsAt < e && b.endsAt > s,
            ),
        )
      )
        continue;
      if (
        proc.requiresEquipment &&
        !equipments.some(
          (eq) =>
            !appointments.some(
              (a) =>
                a.startsAt < e &&
                a.endsAt > s &&
                (a.equipmentId === eq.id ||
                  (a.equipmentId === null &&
                    a.procedure.requiresEquipment &&
                    a.procedure.equipmentLinks.some(
                      (l) => l.equipmentId === eq.id,
                    ))),
            ),
        )
      )
        continue;
      slots.push(time);
    }
    return slots;
  }
  private async automaticOrder(
    tx: Prisma.TransactionClient,
    candidates: { id: number; schedulingPriority: number | null }[],
    settings: {
      assignmentPolicy: string;
      lastBalancedProfessionalId?: number | null;
    },
    start: Date,
    excludeId?: number,
  ) {
    if (settings.assignmentPolicy === "BALANCED") {
      // Professional locks are already held. Serialize the persistent tie-breaker in this transaction.
      await tx.$queryRaw`SELECT id FROM SchedulingSettings WHERE id=1 FOR UPDATE`;
      const current = await tx.schedulingSettings.findUnique({
        where: { id: 1 },
      });
      if (current) Object.assign(settings, current);
    }
    if (settings.assignmentPolicy !== "BALANCED")
      return {
        ids: assignmentPolicy(settings.assignmentPolicy).order(
          candidates.map((p) => ({ id: p.id, priority: p.schedulingPriority })),
        ),
        balanced: false,
      };
    const day = dayRange(dateKey(start));
    const appointments = await tx.appointment.findMany({
      where: {
        ...occupiedWhere(),
        professionalId: { in: candidates.map((p) => p.id) },
        startsAt: { lt: day.end },
        endsAt: { gt: day.start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    });
    const minutes = new Map<number, number>();
    for (const a of appointments) {
      const duration =
        Math.max(
          0,
          Math.min(+a.endsAt, +day.end) - Math.max(+a.startsAt, +day.start),
        ) / 60000;
      minutes.set(
        a.professionalId,
        (minutes.get(a.professionalId) ?? 0) + duration,
      );
    }
    return {
      ids: assignmentPolicy(
        "BALANCED",
        settings.lastBalancedProfessionalId ?? null,
      ).order(
        candidates.map((p) => ({
          id: p.id,
          priority: p.schedulingPriority,
          reservedMinutes: minutes.get(p.id) ?? 0,
        })),
      ),
      balanced: true,
    };
  }
  async reserve(input: ReservationInput, actor: Actor | null) {
    return this.db.$transaction(
      async (tx) => {
        // One ordering for booking and completion: professionals, procedure, equipment.
        const candidates = await tx.professional.findMany({
          where: {
            active: true,
            ...(input.professionalId ? { id: input.professionalId } : {}),
          },
          orderBy: { id: "asc" },
        });
        for (const p of candidates)
          await tx.$queryRaw`SELECT id FROM Professional WHERE id=${p.id} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM \`Procedure\` WHERE id=${input.procedureId} FOR UPDATE`;
        const proc = required(
          await tx.procedure.findUnique({ where: { id: input.procedureId } }),
        );
        if (!proc.active)
          throw new ApplicationError("Procedimento inativo", "CONFLICT");
        const start = new Date(input.startsAt),
          end = this.interval(
            start,
            input.durationMinutes ?? proc.durationMinutes,
          );
        if (input.origin === "EXTERNAL" && start <= new Date())
          throw new ApplicationError(
            "Horário deve estar no futuro",
            "INVALID_INPUT",
          );
        const eligible = (
          await this.eligible(tx, proc.id, start, end, input.professionalId)
        ).filter((p) => candidates.some((locked) => locked.id === p.id));
        const settings = (await tx.schedulingSettings.findUnique({
          where: { id: 1 },
        })) ?? {
          assignmentPolicy: "PRIORITY",
          confirmationMode: "MANUAL",
          holdMinutes: 1440,
        };
        const selection = input.professionalId
          ? { ids: eligible.map((p) => p.id), balanced: false }
          : await this.automaticOrder(tx, eligible, settings, start);
        const ids = selection.ids;
        if (!ids.length)
          throw new ApplicationError(
            "Nenhum profissional habilitado disponível; confira habilitação, jornada e a política da agenda",
            "CONFLICT",
          );
        const professionalId = ids[0];
        if (
          actor?.role === "FUNCIONARIO" &&
          actor.professionalId !== professionalId
        )
          throw new ApplicationError(
            "Só é permitido agendar para si próprio",
            "FORBIDDEN",
          );
        const equipmentId = await this.equipment(
          tx,
          proc,
          start,
          end,
          undefined,
          true,
        );
        const customer = input.customerId
          ? required(
              await tx.customer.findUnique({ where: { id: input.customerId } }),
            )
          : input.customer
            ? ((await tx.customer.findFirst({
                where: { phone: input.customer.phone },
              })) ??
              (await tx.customer.create({
                data: { ...input.customer, acquisitionSource: "OUTRO" },
              })))
            : null;
        if (!customer)
          throw new ApplicationError("Cliente obrigatório", "INVALID_INPUT");
        const status =
          input.status ??
          (input.origin === "EXTERNAL" &&
          settings.confirmationMode === "AUTOMATIC"
            ? "CONFIRMED"
            : "SCHEDULED");
        const expiresAt =
          status === "SCHEDULED" && input.origin === "EXTERNAL"
            ? new Date(
                Math.min(Date.now() + settings.holdMinutes * 60000, +start),
              )
            : null;
        const a = await tx.appointment.create({
          data: {
            customerId: customer.id,
            professionalId,
            procedureId: proc.id,
            startsAt: start,
            endsAt: end,
            equipmentId,
            status,
            expiresAt,
            origin: input.origin ?? "INTERNAL",
          },
        });
        if (input.entitlementId)
          await this.sessions.reserve(
            tx,
            input.entitlementId,
            a.id,
            {
              customerId: customer.id,
              procedureId: proc.id,
              variationId: input.variationId ?? null,
              at: new Date(Math.max(Date.now(), +start)),
            },
            actor!.id,
          );
        if (selection.balanced)
          await tx.schedulingSettings.update({
            where: { id: 1 },
            data: { lastBalancedProfessionalId: professionalId },
          });
        return {
          id: a.id,
          customerId: customer.id,
          professionalId,
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt.toISOString(),
          status: a.status,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 12000,
      },
    );
  }
  async reassign(id: number, professionalId: number | undefined, actor: Actor) {
    if (actor.role !== "ADMIN")
      throw new ApplicationError(
        "Somente administradores podem reatribuir",
        "FORBIDDEN",
      );
    const before = required(
      await this.db.appointment.findUnique({ where: { id } }),
    );
    return this.db.$transaction(
      async (tx) => {
        const candidates = await tx.professional.findMany({
          where: {
            OR: [
              { id: before.professionalId },
              professionalId ? { id: professionalId } : { active: true },
            ],
          },
          orderBy: { id: "asc" },
        });
        for (const p of candidates)
          await tx.$queryRaw`SELECT id FROM Professional WHERE id=${p.id} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM \`Procedure\` WHERE id=${before.procedureId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM Appointment WHERE id=${id} FOR UPDATE`;
        const a = required(await tx.appointment.findUnique({ where: { id } }));
        if (a.professionalId !== before.professionalId)
          throw new ApplicationError(
            "Reserva alterada; atualize a agenda",
            "CONFLICT",
          );
        if (
          !["SCHEDULED", "CONFIRMED"].includes(a.status) ||
          (a.expiresAt && a.expiresAt <= new Date()) ||
          (await tx.attendance.findUnique({ where: { appointmentId: id } }))
        )
          throw new ApplicationError(
            "Reserva encerrada, expirada ou com atendimento iniciado",
            "CONFLICT",
          );
        const proc = required(
          await tx.procedure.findUnique({ where: { id: a.procedureId } }),
        );
        if (!proc.active)
          throw new ApplicationError("Procedimento inativo", "CONFLICT");
        const eligible = (
          await this.eligible(
            tx,
            proc.id,
            a.startsAt,
            a.endsAt,
            professionalId,
            id,
          )
        ).filter((p) => candidates.some((locked) => locked.id === p.id));
        const settings = (await tx.schedulingSettings.findUnique({
          where: { id: 1 },
        })) ?? { assignmentPolicy: "PRIORITY" };
        const selection = professionalId
          ? { ids: eligible.map((p) => p.id), balanced: false }
          : await this.automaticOrder(tx, eligible, settings, a.startsAt, id);
        const ids = selection.ids;
        if (!ids.length)
          throw new ApplicationError(
            "Nenhum profissional habilitado disponível",
            "CONFLICT",
          );
        const equipmentId = await this.equipment(
          tx,
          proc,
          a.startsAt,
          a.endsAt,
          id,
          true,
        );
        const updated = await tx.appointment.update({
          where: { id },
          data: { professionalId: ids[0], equipmentId },
        });
        if (selection.balanced)
          await tx.schedulingSettings.update({
            where: { id: 1 },
            data: { lastBalancedProfessionalId: ids[0] },
          });
        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 12000,
      },
    );
  }
  async confirm(id: number, duration: number | undefined, actor: Actor) {
    const before = required(
      await this.db.appointment.findUnique({ where: { id } }),
    );
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Professional WHERE id=${before.professionalId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM \`Procedure\` WHERE id=${before.procedureId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM Appointment WHERE id=${id} FOR UPDATE`;
        const a = required(await tx.appointment.findUnique({ where: { id } }));
        if (
          a.professionalId !== before.professionalId ||
          a.procedureId !== before.procedureId
        )
          throw new ApplicationError(
            "Reserva alterada; atualize a agenda",
            "CONFLICT",
          );
        if (
          actor?.role === "FUNCIONARIO" &&
          actor.professionalId !== a.professionalId
        )
          throw new ApplicationError(
            "Agendamento pertence a outro profissional",
            "FORBIDDEN",
          );
        if (
          !["SCHEDULED", "CONFIRMED"].includes(a.status) ||
          (a.expiresAt && a.expiresAt <= new Date())
        )
          throw new ApplicationError(
            "Reserva encerrada ou expirada",
            "CONFLICT",
          );
        const end = this.interval(
          a.startsAt,
          duration ?? Math.round((+a.endsAt - +a.startsAt) / 60000),
        );
        if (
          !(
            await this.eligible(
              tx,
              a.procedureId,
              a.startsAt,
              end,
              a.professionalId,
              id,
            )
          ).length
        )
          throw new ApplicationError(
            "Profissional indisponível ou sem habilitação",
            "CONFLICT",
          );
        const proc = required(
          await tx.procedure.findUnique({ where: { id: a.procedureId } }),
        );
        if (!proc.active)
          throw new ApplicationError("Procedimento inativo", "CONFLICT");
        const equipmentId = await this.equipment(
          tx,
          proc,
          a.startsAt,
          end,
          id,
          true,
        );
        await tx.appointment.update({
          where: { id },
          data: {
            status: "CONFIRMED",
            endsAt: end,
            equipmentId,
            expiresAt: null,
          },
        });
        return { id, status: "CONFIRMED", endsAt: end.toISOString() };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 12000,
      },
    );
  }
}
