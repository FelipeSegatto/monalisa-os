import { EquipmentController } from './modules/equipment.controller';
import { EquipmentService } from './modules/equipment.service';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './common/prisma.service';
import { SessionGuard } from './auth/auth.guard';
import { AuthController } from './auth/auth.controller';
import { CatalogController } from './modules/catalog.controller';
import { CustomersController } from './modules/customers.controller';
import { AgendaController } from './modules/agenda.controller';
import { LeadsBookingController } from './modules/leads-booking.controller';
import { StockController } from './modules/stock.controller';
import { FinanceController } from './modules/finance.controller';
import { DashboardController } from './modules/dashboard.controller';
import { UploadsController } from './modules/uploads.controller';
import { SchedulingService } from './modules/scheduling.service';
@Module({controllers:[EquipmentController,AuthController,CatalogController,CustomersController,AgendaController,LeadsBookingController,StockController,FinanceController,DashboardController,UploadsController],providers:[EquipmentService,PrismaService,SchedulingService,{provide:APP_GUARD,useClass:SessionGuard}]})
export class AppModule{}
