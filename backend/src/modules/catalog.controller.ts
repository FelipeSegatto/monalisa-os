import { Inject, BadRequestException, Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Admin, Public } from '../auth/auth.guard';
import { money, parse, required, requiredId } from '../common/util';
import { z } from 'zod';
const text=z.string().trim().min(1).max(190);
const nullableText=z.string().trim().max(4000).nullable();
const variationInput=z.object({groupName:z.string().nullable(),name:text,reference:z.string().nullable(),price:z.number().nonnegative(),active:z.boolean()});
const procedureInput=z.object({categoryId:z.number().int().positive(),name:text,description:nullableText,durationMinutes:z.number().int().min(5).max(720),price:z.number().nonnegative(),active:z.boolean(),variations:z.array(variationInput)});
const procedureInclude={category:true,variations:{orderBy:{sortOrder:'asc' as const}}};
const formatVariation=(v:any)=>({id:v.id,groupName:v.groupName,name:v.name,reference:v.reference,price:money(v.price),active:v.active,sortOrder:v.sortOrder});
function formatProcedure(p:any){const variations=(p.variations||[]).map(formatVariation);return {id:p.id,name:p.name,description:p.description,coverImageUrl:p.coverImageUrl,detailImageUrl:p.detailImageUrl,durationMinutes:p.durationMinutes,price:money(p.price),active:p.active,displayPrice:variations.filter((x:any)=>x.active).length?Math.min(...variations.filter((x:any)=>x.active).map((x:any)=>x.price)):money(p.price),hasVariations:variations.length>0,variations,categoryId:p.categoryId,categoryName:p.category?.name||''};}
@Controller('api/v1')
export class CatalogController{
 constructor(@Inject(PrismaService) private readonly db:PrismaService){}
 @Get('procedure-categories') async categories(){const cats=await this.db.procedureCategory.findMany({orderBy:{name:'asc'},include:{procedures:{orderBy:{name:'asc'},include:{variations:{orderBy:{sortOrder:'asc'}}}}}});return {categories:cats.map(c=>({id:c.id,name:c.name,procedures:c.procedures.map(p=>formatProcedure({...p,category:c}))}))};}
 @Public() @Get('public/catalog') async publicCatalog(){const {categories}=await this.categories();return {categories:categories.map(c=>({...c,procedures:c.procedures.filter(p=>p.active)})).filter(c=>c.procedures.length)};}
 @Get('procedures/:id') async procedure(@Param('id')id:string){return formatProcedure(required(await this.db.procedure.findUnique({where:{id:requiredId(id)},include:procedureInclude})));}
 @Admin() @Post('procedures') async createProcedure(@Body()body:unknown){const p=parse(procedureInput,body);const {variations,...other}=p;const created=await this.db.procedure.create({data:{...other,variations:{create:variations.map((x,i)=>({...x,sortOrder:i}))}}});return this.procedure(String(created.id));}
 @Admin() @Put('procedures/:id') async updateProcedure(@Param('id')id:string,@Body()body:unknown){const p=parse(procedureInput,body);const {variations,...other}=p;const procedureId=requiredId(id);await this.db.$transaction(async tx=>{await tx.procedure.update({where:{id:procedureId},data:other});await tx.procedureVariation.deleteMany({where:{procedureId}});await tx.procedureVariation.createMany({data:variations.map((x,i)=>({...x,procedureId,sortOrder:i}))});});return this.procedure(id);}
 @Admin() @Patch('procedures/:id/active') async active(@Param('id')id:string,@Body()body:unknown){const v=parse(z.object({active:z.boolean()}),body);await this.db.procedure.update({where:{id:requiredId(id)},data:{active:v.active}});return this.procedure(id);}
 @Get('procedures/:id/materials') async materials(@Param('id')id:string){const all=await this.db.procedureMaterial.findMany({where:{procedureId:requiredId(id)},include:{stockItem:true}});return {materials:all.map(m=>({stockItemId:m.stockItemId,itemName:m.stockItem.name,unit:m.stockItem.unit,quantity:String(m.quantity)}))};}
 @Admin() @Put('procedures/:id/materials') async setMaterials(@Param('id')id:string,@Body()body:unknown){const items=parse(z.array(z.object({stockItemId:z.number().int().positive(),quantity:z.number().positive()})),body);const procedureId=requiredId(id);if(new Set(items.map(x=>x.stockItemId)).size!==items.length)throw new BadRequestException('Insumo repetido');await this.db.$transaction(async tx=>{await tx.procedure.update({where:{id:procedureId},data:{materialsReviewedAt:new Date()}});await tx.procedureMaterial.deleteMany({where:{procedureId}});if(items.length)await tx.procedureMaterial.createMany({data:items.map(x=>({...x,procedureId}))});});return this.materials(id);}
}
