import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Admin } from '../auth/auth.guard';
import { categoryLabels, dateKey, iso, parse, required, requiredId } from '../common/util';
import { z } from 'zod';
const source=z.enum(['INDICACAO','INSTAGRAM','WHATSAPP','GOOGLE','OUTRO']);
const input=z.object({name:z.string().trim().min(2).max(120),phone:z.string().trim().min(8).max(30),email:z.union([z.string().email(),z.null()]),birthDate:z.string().nullable(),acquisitionSource:source});
const noteInput=z.object({title:z.string().trim().min(1).max(150),content:z.string().trim().min(1).max(10000)});
const appointmentMap=(a:any)=>({id:a.id,startsAt:iso(a.startsAt),endsAt:iso(a.endsAt),status:a.status,procedureName:a.procedure.name,professionalName:a.professional.name});
@Controller('api/v1')
export class CustomersController {
 constructor(private readonly db:PrismaService){}
 @Get('customers') async list(@Query('search')search?:string,@Query('source')source?:string){const items=await this.db.customer.findMany({where:{name:{contains:search||''},...(source&&source!=='ALL'?{acquisitionSource:source as any}:{})},orderBy:{name:'asc'},include:{appointments:{orderBy:{startsAt:'desc'},take:60}}});const now=new Date();return {customers:items.map(c=>({id:c.id,name:c.name,phone:c.phone,email:c.email,birthDate:c.birthDate?dateKey(c.birthDate):null,acquisitionSource:c.acquisitionSource,acquisitionSourceLabel:categoryLabels[c.acquisitionSource],createdAt:iso(c.createdAt),lastAppointmentAt:iso(c.appointments.find(a=>a.startsAt<now)?.startsAt),nextAppointmentAt:iso([...c.appointments].reverse().find(a=>a.startsAt>=now&&a.status!=='CANCELLED')?.startsAt)}))};}
 @Get('customers/:id') async detail(@Param('id')id:string){const c=required(await this.db.customer.findUnique({where:{id:requiredId(id)},include:{appointments:{include:{procedure:true,professional:true},orderBy:{startsAt:'desc'}}}}));const now=new Date();return {id:c.id,name:c.name,phone:c.phone,email:c.email,birthDate:c.birthDate?dateKey(c.birthDate):null,acquisitionSource:c.acquisitionSource,acquisitionSourceLabel:categoryLabels[c.acquisitionSource],createdAt:iso(c.createdAt),nextAppointment:c.appointments.filter(a=>a.startsAt>=now&&a.status!=='CANCELLED').sort((a,b)=>+a.startsAt- +b.startsAt).map(appointmentMap)[0]||null,history:c.appointments.map(appointmentMap)};}
 @Post('customers') async create(@Body()body:unknown){const p=parse(input,body);const created=await this.db.customer.create({data:{...p,birthDate:p.birthDate?new Date(p.birthDate+'T12:00:00Z'):null}});return this.detail(String(created.id));}
 @Put('customers/:id') async update(@Param('id')id:string,@Body()body:unknown){const p=parse(input,body);await this.db.customer.update({where:{id:requiredId(id)},data:{...p,birthDate:p.birthDate?new Date(p.birthDate+'T12:00:00Z'):null}});return this.detail(id);}
 @Get('customers/:id/notes') async notes(@Param('id')id:string){const notes=await this.db.customerNote.findMany({where:{customerId:requiredId(id)},orderBy:{createdAt:'desc'}});return {notes:notes.map(n=>({...n,createdAt:iso(n.createdAt)}))};}
 @Post('customers/:id/notes') async createNote(@Param('id')id:string,@Body()body:unknown,@Req()req:any){const data=parse(noteInput,body);await this.db.customerNote.create({data:{...data,customerId:requiredId(id),author:req.actor.name}});return this.notes(id);}
 @Put('customers/:id/notes/:noteId') async updateNote(@Param('id')id:string,@Param('noteId')noteId:string,@Body()body:unknown){const data=parse(noteInput,body);const changed=await this.db.customerNote.updateMany({where:{id:requiredId(noteId),customerId:requiredId(id)},data});if(!changed.count)throw new BadRequestException('Nota não encontrada');return this.notes(id);}
 @Delete('customers/:id/notes/:noteId') async deleteNote(@Param('id')id:string,@Param('noteId')noteId:string){await this.db.customerNote.deleteMany({where:{id:requiredId(noteId),customerId:requiredId(id)}});return this.notes(id);}
}
