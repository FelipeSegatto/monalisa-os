import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ProfessionalRepository } from "./domain/professional.repository";
import { ProfessionalQueries } from "./application/professional.queries";
import { ProfessionalAccounts } from "./application/professional-accounts";
import { ProfessionalService } from "./application/professional.service";
import { PrismaProfessionalRepository } from "./infrastructure/prisma-professional.repository";
import { PrismaProfessionalQueries } from "./infrastructure/prisma-professional.queries";
import { AuthProfessionalAccounts } from "./infrastructure/auth-professional-accounts.gateway";
import { ProfessionalsController } from "./presentation/professionals.controller";
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProfessionalsController],
  providers: [
    ProfessionalService,
    { provide: ProfessionalRepository, useClass: PrismaProfessionalRepository },
    { provide: ProfessionalQueries, useClass: PrismaProfessionalQueries },
    { provide: ProfessionalAccounts, useClass: AuthProfessionalAccounts },
  ],
  exports: [ProfessionalService],
})
export class ProfessionalsModule {}
