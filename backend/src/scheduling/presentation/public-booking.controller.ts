import {
  Inject,
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { BookingService } from "../application/booking.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { Public } from "../../auth/auth.guard";
import {
  dateKey,
  dayRange,
  parse,
  required,
  requiredId,
} from "../../common/util";
import { z } from "zod";
const booked = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  startsAt: z.string().datetime({ offset: true }),
  procedureId: z.number().int().positive().optional(),
});
@Controller("api/v1")
export class PublicBookingController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(BookingService) private readonly booking: BookingService,
  ) {}
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
