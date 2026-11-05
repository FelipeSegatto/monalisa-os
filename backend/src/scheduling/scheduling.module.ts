import { CommercialModule } from "../commercial/commercial.module";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { BookingService } from "./application/booking.service";
import { SchedulingRepository } from "./application/scheduling.repository";
import { PrismaSchedulingRepository } from "./infrastructure/prisma-scheduling.repository";
import { SchedulingController } from "./presentation/scheduling.controller";
@Module({
  imports: [CommercialModule, PrismaModule],
  controllers: [SchedulingController],
  providers: [
    BookingService,
    { provide: SchedulingRepository, useClass: PrismaSchedulingRepository },
  ],
  exports: [BookingService],
})
export class SchedulingModule {}
