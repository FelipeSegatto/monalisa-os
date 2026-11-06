import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ApplicationError } from "../../shared/domain/application-error";
import { EmployeeAccountRepository } from "../domain/employee-account.repository";
@Injectable()
export class PrismaEmployeeAccountRepository extends EmployeeAccountRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async find(professionalId: number) {
    return this.db.user.findUnique({
      where: { professionalId },
      select: { email: true },
    });
  }
  async provision(professionalId: number, email: string, passwordHash: string) {
    await this.db.$transaction(async (tx) => {
      const [professional] = await tx.$queryRaw<
        Array<{ id: number; name: string; active: boolean | number }>
      >`SELECT id, name, active FROM Professional WHERE id = ${professionalId} FOR UPDATE`;
      if (!professional)
        throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
      if (professional.active === false || professional.active === 0)
        throw new ApplicationError(
          "Restaure o profissional antes de configurar o acesso",
          "CONFLICT",
        );
      const existing = await tx.user.findUnique({ where: { professionalId } });
      if (existing) {
        await tx.user.update({
          where: { id: existing.id },
          data: { email, passwordHash },
        });
        await tx.session.deleteMany({ where: { userId: existing.id } });
      } else
        await tx.user.create({
          data: {
            name: professional.name,
            email,
            passwordHash,
            role: "FUNCIONARIO",
            professionalId,
          },
        });
    });
  }
}
