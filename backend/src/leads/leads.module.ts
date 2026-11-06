import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { LeadsController } from "./presentation/leads.controller";
@Module({ imports: [PrismaModule], controllers: [LeadsController] })
export class LeadsModule {}
