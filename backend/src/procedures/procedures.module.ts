import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { ProcedureRepository } from "./domain/procedure.repository";
import { ProcedureQueries } from "./application/procedure.queries";
import { EquipmentCompatibilityPort } from "./application/equipment-compatibility.port";
import { ProcedureService } from "./application/procedure.service";
import { PrismaProcedureRepository } from "./infrastructure/prisma-procedure.repository";
import { PrismaProcedureQueries } from "./infrastructure/prisma-procedure.queries";
import { EquipmentCompatibilityAdapter } from "./infrastructure/equipment-compatibility.adapter";
import { ProceduresController } from "./presentation/procedures.controller";
@Module({
  imports: [PrismaModule],
  controllers: [ProceduresController],
  providers: [
    ProcedureService,
    EquipmentCompatibilityAdapter,
    {
      provide: EquipmentCompatibilityPort,
      useExisting: EquipmentCompatibilityAdapter,
    },
    { provide: ProcedureRepository, useClass: PrismaProcedureRepository },
    { provide: ProcedureQueries, useClass: PrismaProcedureQueries },
  ],
  exports: [ProcedureService],
})
export class ProceduresModule {}
