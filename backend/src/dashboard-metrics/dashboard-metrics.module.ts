import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { OccupancyQueries } from "./application/occupancy.queries";
import { PrismaOccupancyQueries } from "./infrastructure/prisma-occupancy.queries";
import { OccupancyController } from "./presentation/occupancy.controller";
@Module({
  imports: [PrismaModule],
  controllers: [OccupancyController],
  providers: [{ provide: OccupancyQueries, useClass: PrismaOccupancyQueries }],
})
export class DashboardMetricsModule {}
