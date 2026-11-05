import { ShotLedgerService } from "./application/shot-ledger.service";
import { ShotLedgerRepository } from "./application/shot-ledger.repository";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { PrismaShotLedger } from "./infrastructure/prisma-shot-ledger";
import { ShotLedgerController } from "./presentation/shot-ledger.controller";
@Module({
  imports: [PrismaModule],
  controllers: [ShotLedgerController],
  providers: [
    PrismaShotLedger,
    ShotLedgerService,
    { provide: ShotLedgerRepository, useExisting: PrismaShotLedger },
  ],
  exports: [PrismaShotLedger],
})
export class ShotLedgerModule {}
