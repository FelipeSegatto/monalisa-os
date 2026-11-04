import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
async function bootstrap(){
 const app=await NestFactory.create<NestExpressApplication>(AppModule,{bodyParser:true});
 app.enableCors({origin:(process.env.CORS_ORIGIN||'http://localhost:5199').split(',').map(x=>x.trim()),credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS']});
 app.useGlobalFilters({catch(exception:unknown,host:any){const res=host.switchToHttp().getResponse(); const status=exception instanceof HttpException?exception.getStatus():500; const raw=exception instanceof HttpException?exception.getResponse():null;const error=typeof raw==='string'?raw:typeof raw==='object'&&raw!==null&&'message'in raw?(raw as any).message:'Erro interno';res.status(status).json({error:typeof error==='string'?error:JSON.stringify(error),statusCode:status});}} as any);
 await app.listen(Number(process.env.PORT||3333),'0.0.0.0');console.log(`API NestJS ativa: http://localhost:${process.env.PORT||3333}`);
}
bootstrap();
