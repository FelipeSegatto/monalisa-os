import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { CommercialService } from "./application/commercial.service";
import { CommercialRepository } from "./application/commercial.repository";
import { PrismaCommercialRepository } from "./infrastructure/prisma-commercial.repository";
import { PrismaOfferCatalog } from "./infrastructure/prisma-offer-catalog";
import { PrismaCommercialSales } from "./infrastructure/prisma-commercial-sales";
import { PrismaSessionLedger } from "./infrastructure/prisma-session-ledger";
import { CommercialController } from "./presentation/commercial.controller";
@Module({
  imports: [PrismaModule],
  controllers: [CommercialController],
  providers: [
    CommercialService,
    PrismaOfferCatalog,
    PrismaCommercialSales,
    PrismaSessionLedger,
    { provide: CommercialRepository, useClass: PrismaCommercialRepository },
  ],
  exports: [CommercialService, PrismaSessionLedger],
})
export class CommercialModule {}
