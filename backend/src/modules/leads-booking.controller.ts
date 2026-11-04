import { Inject, BadRequestException, Body, ConflictException, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Public } from '../auth/auth.guard';
import { dateKey, dayRange, iso, parse, required, requiredId } from '../common/util';
import { z } from 'zod';
import { SchedulingService } from './scheduling.service';
const leadInput=z.object({name:z.string().trim().min(2).max(120),phone:z.string().trim().min(8).max(30),procedureCategoryId:z.number().int().positive().nullable(),message:z.string().max(2000).nullable()});
const booked=z.object({name:z.string().trim().min(2).max(120),phone:z.string().trim().min(8).max(30),startsAt:z.string().datetime({offset:true})});
const FREE_DURATION=30;
const officeSlots=(date:string)=>{const wd=new Date(date+'T12:00:00Z').getUTCDay();if(wd===0)return [];const slots:string[]=[];for(let h=9;h<17;h++)for(const m of [0,30])slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);return slots;};
const leadMap=(l:any)=>({...l,createdAt:iso(l.createdAt),procedureCategoryName:l.procedureCategory?.name||null});
@Controller('api/v1')
export class LeadsBookingController{
 constructor(@Inject(PrismaService) private readonly db:PrismaService,@Inject(SchedulingService) private readonly scheduling:SchedulingService){}
 @Public() @Post('public/leads') async create(@Body()body:unknown){const p=parse(leadInput,body);return leadMap(await this.db.lead.create({data:p,include:{procedureCategory:true}}));}
 @Get('leads') async list(){const all=await this.db.lead.findMany({include:{procedureCategory:true},orderBy:{createdAt:'desc'}});return {leads:all.map(leadMap)};}
 @Patch('leads/:id/status') async status(@Param('id')id:string,@Body()body:unknown){const p=parse(z.object({status:z.enum(['NEW','CONTACTED'])}),body);return leadMap(await this.db.lead.update({where:{id:requiredId(id)},data:{status:p.status},include:{procedureCategory:true}}));}
 private async available(date:string){const today=dateKey(new Date());const max=new Date();max.setDate(max.getDate()+30);if(date<today||date>dateKey(max))throw new BadRequestException('Agendamento permitido apenas nos próximos 30 dias');const {start,end}=dayRange(date);const pro=await this.db.professional.findFirst({where:{active:true},orderBy:{id:'asc'}});if(!pro)return {professional:null,slots:[]};const ap=await this.db.appointment.findMany({where:{professionalId:pro.id,startsAt:{lt:end},endsAt:{gt:start},status:{in:['SCHEDULED','CONFIRMED','COMPLETED']}}});const blocks=await this.db.agendaBlock.findMany({where:{professionalId:pro.id,startsAt:{lt:end},endsAt:{gt:start}}});const slots=officeSlots(date).filter(time=>{const s=new Date(`${date}T${time}:00-03:00`),e=new Date(+s+FREE_DURATION*60000);return s>new Date()&&!ap.some(a=>a.startsAt<e&&a.endsAt>s)&&!blocks.some(b=>b.startsAt<e&&b.endsAt>s);});return {professional:pro,slots};}
 @Public() @Get('public/booking/slots') async slots(@Query('date')date:string){if(!date)throw new BadRequestException('Data obrigatória');const a=await this.available(date);return {date,slots:a.slots};}
 @Public() @Post('public/booking/free') async book(@Body()body:unknown){const p=parse(booked,body);const start=new Date(p.startsAt);const date=dateKey(start),time=new Date(start.getTime()-3*3600000).toISOString().slice(11,16);const {professional,slots}=await this.available(date);if(!professional||!slots.includes(time))throw new ConflictException('Horário indisponível');const procedure=await this.db.procedure.findFirst({where:{name:'Avaliação gratuita',active:true}});if(!procedure)throw new BadRequestException('Procedimento de avaliação não configurado');const end=new Date(+start+FREE_DURATION*60000);
  return this.db.$transaction(async tx=>{
   await this.scheduling.lockAndAssertAvailable(tx,professional.id,start,end);
   const customer=await tx.customer.findFirst({where:{phone:p.phone}})||await tx.customer.create({data:{name:p.name,phone:p.phone,acquisitionSource:'OUTRO'}});
   const a=await tx.appointment.create({data:{customerId:customer.id,professionalId:professional.id,procedureId:procedure.id,startsAt:start,endsAt:end,status:'SCHEDULED'}});
   return {appointmentId:a.id,customerId:customer.id,startsAt:iso(start),endsAt:iso(end)};
  });
 }
}
