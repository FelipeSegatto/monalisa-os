import { Inject, BadRequestException, Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Admin } from '../auth/auth.guard';
import { iso, parse, required, requiredId } from '../common/util';
import { z } from 'zod';
const input=z.object({name:z.string().trim().min(2).max(150),unit:z.string().trim().min(1).max(30),minQuantity:z.number().nonnegative(),active:z.boolean().optional(),initialQuantity:z.number().nonnegative().optional()});
const itemOut=(s:any)=>({id:s.id,name:s.name,unit:s.unit,quantity:String(s.quantity),minQuantity:String(s.minQuantity),active:s.active,isLow:Number(s.quantity)<=Number(s.minQuantity)});
@Controller('api/v1/stock')
export class StockController{
 constructor(@Inject(PrismaService) private readonly db:PrismaService){}
 @Get('items')async list(){const data=await this.db.stockItem.findMany({orderBy:{name:'asc'}});return {items:data.map(itemOut)};}
 @Get('items/:id')async detail(@Param('id')id:string){const s=required(await this.db.stockItem.findUnique({where:{id:requiredId(id)},include:{movements:{orderBy:{createdAt:'desc'}}}}));return {...itemOut(s),movements:s.movements.map(m=>({id:m.id,type:m.type,quantityDelta:String(m.quantityDelta),note:m.note,createdAt:iso(m.createdAt)}))};}
 @Admin()@Post('items')async create(@Body()body:unknown){const {initialQuantity=0,...p}=parse(input,body);const s=await this.db.stockItem.create({data:{...p,quantity:initialQuantity,movements:initialQuantity?{create:{type:'IN',quantityDelta:initialQuantity,note:'Saldo inicial'}}:undefined}});return itemOut(s);}
 @Admin()@Put('items/:id')async update(@Param('id')id:string,@Body()body:unknown){const {initialQuantity,...p}=parse(input,body);const s=await this.db.stockItem.update({where:{id:requiredId(id)},data:p});return itemOut(s);}
 @Admin()@Post('items/:id/movements')async movement(@Param('id')id:string,@Body()body:unknown){const p=parse(z.object({type:z.enum(['IN','ADJUSTMENT']),quantity:z.number().finite(),note:z.string().nullable().optional()}),body);if(p.type==='IN'&&p.quantity<=0)throw new BadRequestException('Entrada deve ser positiva');const itemId=requiredId(id);await this.db.$transaction(async tx=>{const s=required(await tx.stockItem.findUnique({where:{id:itemId}}));const delta=p.quantity;if(Number(s.quantity)+delta<0)throw new BadRequestException('Estoque não pode ficar negativo');await tx.stockItem.update({where:{id:itemId},data:{quantity:{increment:delta}}});await tx.stockMovement.create({data:{stockItemId:itemId,type:p.type,quantityDelta:delta,note:p.note||null}});});return this.detail(id);}
}
