import { ExpensesModule } from "./expenses/expenses.module";
import { DashboardMetricsModule } from "./dashboard-metrics/dashboard-metrics.module";
import { FinanceModule } from "./finance/finance.module";
import { LeadsModule } from "./leads/leads.module";
import { CommercialModule } from "./commercial/commercial.module";
import { ProcedureMetricsModule } from "./procedure-metrics/procedure-metrics.module";
import { SchedulingModule } from "./scheduling/scheduling.module";
import { AttendancesModule } from "./attendances/attendances.module";
import { InventoryModule } from "./inventory/inventory.module";
import { ProceduresModule } from "./procedures/procedures.module";
import { CustomersModule } from "./customers/customers.module";
import { ProfessionalsModule } from "./professionals/professionals.module";
import { EquipmentsModule } from "./equipments/equipments.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { ApiExceptionFilter } from "./shared/presentation/api-exception.filter";
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EquipmentsModule,
    CustomersModule,
    ProfessionalsModule,
    ProceduresModule,
    SchedulingModule,
    AttendancesModule,
    InventoryModule,
    ProcedureMetricsModule,
    CommercialModule,
    ExpensesModule,
    FinanceModule,
    LeadsModule,
    DashboardMetricsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
