import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { EquipmentRepository } from "./domain/equipment.repository";
import { EquipmentService } from "./application/equipment.service";
import { EquipmentQueries } from "./application/equipment.queries";
import { EquipmentClock } from "./application/equipment-clock";
import { PrismaEquipmentRepository } from "./infrastructure/prisma-equipment.repository";
import { PrismaEquipmentQueries } from "./infrastructure/prisma-equipment.queries";
import { SystemEquipmentClock } from "./infrastructure/system-equipment-clock";
import { EquipmentController } from "./presentation/equipment.controller";
@Module({
  imports: [PrismaModule],
  controllers: [EquipmentController],
  providers: [
    EquipmentService,
    { provide: EquipmentRepository, useClass: PrismaEquipmentRepository },
    { provide: EquipmentQueries, useClass: PrismaEquipmentQueries },
    { provide: EquipmentClock, useClass: SystemEquipmentClock },
  ],
  exports: [EquipmentService],
})
export class EquipmentsModule {}
