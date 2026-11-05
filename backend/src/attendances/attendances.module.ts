import { CommercialModule } from "../commercial/commercial.module";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { ShotLedgerModule } from "../shot-ledger/shot-ledger.module";
import { AttendanceService } from "./application/attendance.service";
import { AttendanceRepository } from "./application/attendance.repository";
import { PrismaAttendanceRepository } from "./infrastructure/prisma-attendance.repository";
import { AttendancesController } from "./presentation/attendances.controller";
@Module({
  imports: [CommercialModule, PrismaModule, ShotLedgerModule],
  controllers: [AttendancesController],
  providers: [
    AttendanceService,
    { provide: AttendanceRepository, useClass: PrismaAttendanceRepository },
  ],
  exports: [AttendanceService],
})
export class AttendancesModule {}
