import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { CashFlowQueries } from "./application/cash-flow.queries";
import { PrismaCashFlowQueries } from "./infrastructure/prisma-cash-flow.queries";
@Module({
  imports: [PrismaModule],
  providers: [{ provide: CashFlowQueries, useClass: PrismaCashFlowQueries }],
  exports: [CashFlowQueries],
})
export class FinanceReadModule {}
