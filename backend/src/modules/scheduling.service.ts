import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, AppointmentStatus } from '@prisma/client';
import { validInterval } from '../domain/appointment-policy';
const OCCUPIED:AppointmentStatus[]=['SCHEDULED','CONFIRMED','COMPLETED'];
/** Caso de uso de disponibilidade compartilhado pelas agendas interna e pública. */
@Injectable()
export class SchedulingService {
 assertInterval(start:Date,end:Date){if(!validInterval({start,end}))throw new BadRequestException('Intervalo inválido ou acima de 12 horas');}
 async lockAndAssertAvailable(tx:Prisma.TransactionClient,professionalId:number,start:Date,end:Date){
  this.assertInterval(start,end);
  const row=await tx.$queryRaw<Array<{id:number}>>`SELECT id FROM Professional WHERE id = ${professionalId} FOR UPDATE`;
  if(!row.length)throw new BadRequestException('Profissional não encontrado');
  const appointment=await tx.appointment.findFirst({where:{professionalId,status:{in:OCCUPIED},startsAt:{lt:end},endsAt:{gt:start}}});
  const block=await tx.agendaBlock.findFirst({where:{professionalId,startsAt:{lt:end},endsAt:{gt:start}}});
  if(appointment||block)throw new ConflictException('Horário indisponível: já existe agendamento ou bloqueio');
 }
}
