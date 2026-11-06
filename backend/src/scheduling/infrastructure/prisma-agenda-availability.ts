import { occupiedWhere } from "./prisma-scheduling.repository";
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { validInterval } from "../domain/appointment-policy";
/** Locks and overlap queries used by agenda mutations. Public reservations use BookingService. */
@Injectable()
export class PrismaAgendaAvailability {
  assertInterval(start: Date, end: Date) {
    if (!validInterval({ start, end }))
      throw new BadRequestException("Intervalo inválido ou acima de 12 horas");
  }
  async lockAndAssertAvailable(
    tx: Prisma.TransactionClient,
    professionalId: number,
    start: Date,
    end: Date,
  ) {
    this.assertInterval(start, end);
    const row = await tx.$queryRaw<
      Array<{ id: number }>
    >`SELECT id FROM Professional WHERE id = ${professionalId} FOR UPDATE`;
    if (!row.length)
      throw new BadRequestException("Profissional não encontrado");
    const appointment = await tx.appointment.findFirst({
      where: {
        ...occupiedWhere(),
        professionalId,
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
    });
    const block = await tx.agendaBlock.findFirst({
      where: { professionalId, startsAt: { lt: end }, endsAt: { gt: start } },
    });
    if (appointment || block)
      throw new ConflictException(
        "Horário indisponível: já existe agendamento ou bloqueio",
      );
  }
}
