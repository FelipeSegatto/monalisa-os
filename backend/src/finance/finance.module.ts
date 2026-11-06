import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { CommercialModule } from "../commercial/commercial.module";
import { FinanceReadModule } from "./finance-read.module";
import { FinanceController } from "./presentation/finance.controller";
@Module({
  imports: [PrismaModule, CommercialModule, FinanceReadModule],
  controllers: [FinanceController],
})
export class FinanceModule {}
