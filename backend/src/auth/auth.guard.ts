import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';
import { hashToken } from './security';
export const Public=()=>SetMetadata('isPublic',true);
export const Admin=()=>SetMetadata('adminOnly',true);
export type Actor={id:number;name:string;role:'ADMIN'|'FUNCIONARIO';professionalId:number|null};
@Injectable()
export class SessionGuard implements CanActivate {
 constructor(@Inject(PrismaService) private readonly db:PrismaService,@Inject(Reflector) private readonly reflector:Reflector){}
 async canActivate(context:ExecutionContext):Promise<boolean>{
  const req=context.switchToHttp().getRequest();
  const origin=String(req.headers.origin||'');
  const permitted=(process.env.CORS_ORIGIN||'http://localhost:5199').split(',').map(x=>x.trim());
  if(origin && !permitted.includes(origin) && !['GET','HEAD','OPTIONS'].includes(req.method))throw new ForbiddenException('Origem não permitida');
  if(req.method==='GET' && /^\/uploads\/procedure\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(req.path))return true;
  if(this.reflector.getAllAndOverride<boolean>('isPublic',[context.getHandler(),context.getClass()]))return true;
  const cookies=String(req.headers.cookie||'').split(';').map((x:string)=>x.trim());
  const token=cookies.find((c:string)=>c.startsWith('clinic_session='))?.slice('clinic_session='.length);
  if(!token||! /^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Faça login para continuar');
  const sess=await this.db.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}});
  if(!sess || sess.expiresAt<=new Date()) throw new UnauthorizedException('Sessão expirada');
  req.actor={id:sess.user.id,name:sess.user.name,role:sess.user.role,professionalId:sess.user.professionalId} as Actor;
  if(this.reflector.getAllAndOverride<boolean>('adminOnly',[context.getHandler(),context.getClass()]) && sess.user.role!=='ADMIN')throw new ForbiddenException('Acesso restrito a administradores');
  return true;
 }
}
