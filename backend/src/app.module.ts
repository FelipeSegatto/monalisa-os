import { ProceduresModule } from "./procedures/procedures.module";
import { CustomersModule } from "./customers/customers.module";
import { ProfessionalsModule } from "./professionals/professionals.module";
import { EquipmentsModule } from "./equipments/equipments.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { ApiExceptionFilter } from "./shared/presentation/api-exception.filter";
import { AgendaController } from "./modules/agenda.controller";
import { LeadsBookingController } from "./modules/leads-booking.controller";
import { StockController } from "./modules/stock.controller";
import { FinanceController } from "./modules/finance.controller";
import { DashboardController } from "./modules/dashboard.controller";
import { UploadsController } from "./modules/uploads.controller";
import { SchedulingService } from "./modules/scheduling.service";
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EquipmentsModule,
    CustomersModule,
    ProfessionalsModule,
    ProceduresModule,
  ],
  controllers: [
    AgendaController,
    LeadsBookingController,
    StockController,
    FinanceController,
    DashboardController,
    UploadsController,
  ],
  providers: [
    SchedulingService,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
