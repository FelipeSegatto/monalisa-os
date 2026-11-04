import { Inject, Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../common/prisma.service';
import { Public } from './auth.guard';
import { verifyPassword, hashToken, newToken } from './security';
import { parse } from '../common/util';
import { z } from 'zod';
const attempts=new Map<string,{hits:number;until:number}>();
const COOKIE_NAME='clinic_session';
const cookieOptions={httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax' as const,path:'/',maxAge:7*86400000};
@Controller('api/v1')
export class AuthController{
 constructor(@Inject(PrismaService) private readonly db:PrismaService){}
 @Public() @Post('auth/login') @HttpCode(200)
 async login(@Body() body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){
  const input=parse(z.object({email:z.string().email(),password:z.string().min(1)}),body);
  const key=String(req.ip||req.socket.remoteAddress||'unknown'); const state=attempts.get(key);
  if(state&&state.hits>=10&&state.until>Date.now())throw new UnauthorizedException('Muitas tentativas. Tente novamente depois.');
  const user=await this.db.user.findUnique({where:{email:input.email.toLowerCase()}});
  if(!user||!verifyPassword(input.password,user.passwordHash)){
   const old=state&&state.until>Date.now()?state.hits:0; attempts.set(key,{hits:old+1,until:Date.now()+15*60000});
   throw new UnauthorizedException('Email ou senha inválidos');
  }
  attempts.delete(key);
  const token=newToken();const expiresAt=new Date(Date.now()+7*86400000);
  await this.db.session.create({data:{tokenHash:hashToken(token),userId:user.id,expiresAt}});
  res.cookie(COOKIE_NAME,token,cookieOptions);
  return {id:user.id,name:user.name,email:user.email};
 }
 @Get('me') async me(@Req()req:Request){const u=(req as any).actor;return {id:u.id,name:u.name,firstName:u.name.split(' ')[0],role:u.role,professionalId:u.professionalId,roleLabel:u.role==='ADMIN'?'Administrador':'Funcionário'};}
 @Post('auth/logout') @HttpCode(200) async logout(@Req()req:Request,@Res({passthrough:true})res:Response){
  const token=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE_NAME+'='))?.split('=')[1];
  if(token)await this.db.session.deleteMany({where:{tokenHash:hashToken(token)}});
  res.clearCookie(COOKIE_NAME,{path:'/',sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',httpOnly:true});return {ok:true};
 }
}
