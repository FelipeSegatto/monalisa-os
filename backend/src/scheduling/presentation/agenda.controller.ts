import { PrismaSessionLedger } from "../../commercial/infrastructure/prisma-session-ledger";
import { isExpiredReservation } from "../domain/reservation-hold";
import { BookingService } from "../application/booking.service";
import {
  Inject,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Prisma, AppointmentStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { Public } from "../../auth/auth.guard";
import {
  dayRange,
  dateKey,
  iso,
  parse,
  required,
  requiredId,
} from "../../common/util";
import { z } from "zod";
import { canTransition } from "../domain/appointment-policy";
import { PrismaAgendaAvailability } from "../infrastructure/prisma-agenda-availability";
const APOINT = z.object({
  entitlementId: z.number().int().positive().optional(),
  variationId: z.number().int().positive().nullable().optional(),
  customerId: z.number().int().positive(),
  professionalId: z.number().int().positive().optional(),
  durationMinutes: z.number().int().min(1).max(720).optional(),
  procedureId: z.number().int().positive(),
  startsAt: z.string().datetime({ offset: true }),
  status: z.enum(["SCHEDULED", "CONFIRMED"]).optional(),
});
const BLOCK = z.object({
  professionalId: z.number().int().positive().optional(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reason: z.string().nullable(),
});
const full = {
  customer: true,
  professional: true,
  procedure: true,
  sessionReservation: { include: { entitlement: true } },
};
const output = (a: any) => ({
  id: a.id,
  sessionReservation: a.sessionReservation ?? null,
  expired: isExpiredReservation(a.status, a.expiresAt),
  startsAt: iso(a.startsAt),
  endsAt: iso(a.endsAt),
  status: a.status,
  customerName: a.customer.name,
  procedureName: a.procedure.name,
  procedureId: a.procedureId,
  customerId: a.customerId,
  equipmentId: a.equipmentId,
  professionalId: a.professionalId,
  professionalName: a.professional.name,
  professionalColor: a.professional.color,
});
@Controller("api/v1")
export class AgendaController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PrismaAgendaAvailability)
    private readonly scheduling: PrismaAgendaAvailability,
    @Inject(BookingService) private readonly booking: BookingService,
    @Inject(PrismaSessionLedger) private readonly sessions: PrismaSessionLedger,
  ) {}
  @Get("agenda") async daily(@Query("date") date?: string, @Req() req?: any) {
    const { start, end } = dayRange(date || dateKey(new Date()));
    const all = await this.db.appointment.findMany({
      where: {
        startsAt: { gte: start, lt: end },
        ...(req?.actor?.role === "FUNCIONARIO" && req.actor.professionalId
          ? { professionalId: req.actor.professionalId }
          : {}),
      },
      include: full,
      orderBy: { startsAt: "asc" },
    });
    const pros = await this.db.professional.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return {
      date: date || dateKey(new Date()),
      professionals: pros.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
      })),
      appointments: all.map(output),
    };
  }
  @Get("agenda/week") async week(@Query("date") date?: string) {
    const day = date || dateKey(new Date());
    const { start } = dayRange(day);
    const localWeekday = new Date(day + "T12:00:00Z").getUTCDay();
    const offset = (localWeekday + 6) % 7;
    const monday = new Date(start.getTime() - offset * 86400000);
    let days = [];
    for (let i = 0; i < 7; i++) {
      const s = new Date(monday.getTime() + i * 86400000),
        e = new Date(s.getTime() + 86400000);
      const count = await this.db.appointment.count({
        where: {
          startsAt: { gte: s, lt: e },
          status: { not: "CANCELLED" },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
            { status: { not: "SCHEDULED" } },
          ],
        },
      });
      days.push({ date: dateKey(s), count });
    }
    return { weekStart: days[0].date, days };
  }
  @Get("agenda/month") async month(@Query("date") date?: string) {
    const day = date || dateKey(new Date());
    const first = day.slice(0, 7) + "-01";
    const daysInMonth = new Date(
      Number(day.slice(0, 4)),
      Number(day.slice(5, 7)),
      0,
    ).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = first.slice(0, 8) + String(i).padStart(2, "0");
      const { start, end } = dayRange(d);
      const count = await this.db.appointment.count({
        where: {
          startsAt: { gte: start, lt: end },
          status: { not: "CANCELLED" },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
            { status: { not: "SCHEDULED" } },
          ],
        },
      });
      days.push({ date: d, count });
    }
    return {
      monthStart: first,
      monthStartWeekday: new Date(first + "T12:00:00Z").getUTCDay(),
      days,
    };
  }
  @Post("agenda") async create(@Body() body: unknown, @Req() req: any) {
    return this.booking.reserve(parse(APOINT, body), req.actor);
  }
  @Patch("agenda/:id/status") async status(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const data = parse(
      z.object({
        status: z.enum([
          "SCHEDULED",
          "CONFIRMED",
          "CANCELLED",
          "COMPLETED",
          "NO_SHOW",
        ]),
        durationMinutes: z.number().int().min(1).max(720).optional(),
      }),
      body,
    );
    const appointmentId = requiredId(id);
    if (data.status === "CONFIRMED")
      return this.booking.confirm(
        appointmentId,
        data.durationMinutes,
        req.actor,
      );
    if (data.status === "COMPLETED")
      throw new BadRequestException(
        "Conclua pelo atendimento, confirmando materiais e disparos",
      );
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Appointment WHERE id=${appointmentId} FOR UPDATE`;
        const a = required(
          await tx.appointment.findUnique({ where: { id: appointmentId } }),
        );
        if (
          req.actor.role === "FUNCIONARIO" &&
          req.actor.professionalId !== a.professionalId
        )
          throw new BadRequestException(
            "Agendamento pertence a outro profissional",
          );
        if (!canTransition(a.status, data.status))
          throw new BadRequestException("Transição de status inválida");
        if (await tx.attendance.findUnique({ where: { appointmentId } }))
          throw new ConflictException(
            "Atendimento já iniciado; não altere o status pela agenda",
          );
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: data.status },
        });
        if (data.status === "CANCELLED" || data.status === "NO_SHOW")
          await this.sessions.release(
            tx,
            appointmentId,
            req.actor.id,
            "Reserva cancelada ou não comparecimento",
          );
        return { id: appointmentId, status: data.status };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  @Get("agenda/blocks") async blocks(
    @Query("date") date?: string,
    @Req() req?: any,
  ) {
    const day = date || dateKey(new Date());
    const { start, end } = dayRange(day);
    const all = await this.db.agendaBlock.findMany({
      where: {
        startsAt: { lt: end },
        endsAt: { gt: start },
        ...(req?.actor?.role === "FUNCIONARIO" && req.actor.professionalId
          ? { professionalId: req.actor.professionalId }
          : {}),
      },
      include: { professional: true },
      orderBy: { startsAt: "asc" },
    });
    return {
      date: day,
      blocks: all.map((b) => ({
        ...b,
        startsAt: iso(b.startsAt),
        endsAt: iso(b.endsAt),
        professionalName: b.professional.name,
        professionalColor: b.professional.color,
      })),
    };
  }
  @Post("agenda/blocks") async createBlock(
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(BLOCK, body);
    const pro =
      req.actor.role === "FUNCIONARIO"
        ? req.actor.professionalId
        : p.professionalId;
    if (!pro) throw new BadRequestException("Selecione um profissional");
    const start = new Date(p.startsAt),
      end = new Date(p.endsAt);
    this.scheduling.assertInterval(start, end);
    return this.db.$transaction(
      async (tx) => {
        await this.scheduling.lockAndAssertAvailable(tx, pro, start, end);
        const b = await tx.agendaBlock.create({
          data: {
            professionalId: pro,
            createdByUserId: req.actor.id,
            startsAt: start,
            endsAt: end,
            reason: p.reason,
          },
        });
        return {
          id: b.id,
          professionalId: b.professionalId,
          startsAt: iso(b.startsAt),
          endsAt: iso(b.endsAt),
          reason: b.reason,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  @Delete("agenda/blocks/:id") async removeBlock(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const block = required(
      await this.db.agendaBlock.findUnique({ where: { id: requiredId(id) } }),
    );
    if (
      req.actor.role === "FUNCIONARIO" &&
      block.professionalId !== req.actor.professionalId
    )
      throw new BadRequestException("Sem permissão para excluir");
    await this.db.agendaBlock.delete({ where: { id: block.id } });
    return { ok: true };
  }
}
