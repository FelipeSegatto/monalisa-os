import { BookingService } from "../scheduling/application/booking.service";
import {
  Inject,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { Public } from "../auth/auth.guard";
import {
  dateKey,
  dayRange,
  iso,
  parse,
  required,
  requiredId,
} from "../common/util";
import { z } from "zod";
import { SchedulingService } from "./scheduling.service";
const leadInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  procedureCategoryId: z.number().int().positive().nullable(),
  message: z.string().max(2000).nullable(),
});
const booked = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  startsAt: z.string().datetime({ offset: true }),
  procedureId: z.number().int().positive().optional(),
});
const leadMap = (l: any) => ({
  ...l,
  createdAt: iso(l.createdAt),
  procedureCategoryName: l.procedureCategory?.name || null,
});
@Controller("api/v1")
export class LeadsBookingController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(SchedulingService) private readonly scheduling: SchedulingService,
    @Inject(BookingService) private readonly booking: BookingService,
  ) {}
  @Public() @Post("public/leads") async create(@Body() body: unknown) {
    const p = parse(leadInput, body);
    return leadMap(
      await this.db.lead.create({
        data: p,
        include: { procedureCategory: true },
      }),
    );
  }
  @Get("leads") async list() {
    const all = await this.db.lead.findMany({
      include: { procedureCategory: true },
      orderBy: { createdAt: "desc" },
    });
    return { leads: all.map(leadMap) };
  }
  @Patch("leads/:id/status") async status(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const p = parse(z.object({ status: z.enum(["NEW", "CONTACTED"]) }), body);
    return leadMap(
      await this.db.lead.update({
        where: { id: requiredId(id) },
        data: { status: p.status },
        include: { procedureCategory: true },
      }),
    );
  }
  private async bookingProcedure(procedureId?: number) {
    return required(
      procedureId
        ? await this.db.procedure.findUnique({ where: { id: procedureId } })
        : await this.db.procedure.findFirst({
            where: { name: "Avaliação gratuita", active: true },
          }),
      "Procedimento não configurado",
    );
  }
  private async available(date: string, procedureId?: number) {
    const today = dateKey(new Date()),
      max = new Date();
    max.setDate(max.getDate() + 30);
    dayRange(date);
    if (date < today || date > dateKey(max))
      throw new BadRequestException(
        "Agendamento permitido apenas nos próximos 30 dias",
      );
    const procedure = await this.bookingProcedure(procedureId);
    const slots = await this.booking.dailySlots(procedure.id, date);
    return { procedure, slots };
  }
  @Public() @Get("public/booking/slots") async slots(
    @Query("date") date: string,
    @Query("procedureId") procedureId?: string,
  ) {
    if (!date) throw new BadRequestException("Data obrigatória");
    const a = await this.available(
      date,
      procedureId ? requiredId(procedureId) : undefined,
    );
    return { date, slots: a.slots };
  }
  @Public() @Post("public/booking/free") async book(@Body() body: unknown) {
    const p = parse(booked, body),
      start = new Date(p.startsAt),
      date = dateKey(start),
      time = new Date(+start - 3 * 3600000).toISOString().slice(11, 16);
    const { procedure, slots } = await this.available(date, p.procedureId);
    if (start.getSeconds() || start.getMilliseconds() || !slots.includes(time))
      throw new ConflictException("Horário indisponível");
    const result = (await this.booking.reserve(
      {
        customer: { name: p.name, phone: p.phone },
        procedureId: procedure.id,
        startsAt: p.startsAt,
      },
      null,
    )) as {
      id: number;
      customerId: number;
      startsAt: string;
      endsAt: string;
      status: string;
    };
    return {
      appointmentId: result.id,
      customerId: result.customerId,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
      status: result.status,
    };
  }
}
