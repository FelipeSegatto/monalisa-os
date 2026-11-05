import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { ProcedureMetricsQueries } from "./application/procedure-metrics.queries";
import { PrismaProcedureMetricsQueries } from "./infrastructure/prisma-procedure-metrics.queries";
import { ProcedureMetricsController } from "./presentation/procedure-metrics.controller";
@Module({
  imports: [PrismaModule],
  controllers: [ProcedureMetricsController],
  providers: [
    {
      provide: ProcedureMetricsQueries,
      useClass: PrismaProcedureMetricsQueries,
    },
  ],
})
export class ProcedureMetricsModule {}
