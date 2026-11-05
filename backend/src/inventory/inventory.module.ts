import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { InventoryService } from "./application/inventory.service";
import { InventoryRepository } from "./application/inventory.repository";
import { PrismaInventoryRepository } from "./infrastructure/prisma-inventory.repository";
@Module({
  imports: [PrismaModule],
  providers: [
    InventoryService,
    { provide: InventoryRepository, useClass: PrismaInventoryRepository },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
