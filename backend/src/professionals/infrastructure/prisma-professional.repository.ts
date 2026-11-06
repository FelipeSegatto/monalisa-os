import { ApplicationError } from "../../shared/domain/application-error";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { Professional } from "../domain/professional";
import { ProfessionalRepository } from "../domain/professional.repository";
@Injectable()
export class PrismaProfessionalRepository extends ProfessionalRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async find(id: number) {
    const row = await this.db.professional.findUnique({ where: { id } });
    return row ? Professional.restore(row) : null;
  }
  async create(professional: Professional) {
    const { id, ...data } = professional.snapshot();
    return (await this.db.professional.create({ data })).id;
  }
  async save(professional: Professional) {
    const { id, ...data } = professional.snapshot();
    if (id === null)
      throw new ApplicationError(
        "Profissional precisa estar cadastrado",
        "CONFLICT",
      );
    await this.db.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<
        Array<{ id: number }>
      >`SELECT id FROM Professional WHERE id = ${id} FOR UPDATE`;
      if (!current)
        throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
      const account = await tx.user.findUnique({
        where: { professionalId: id },
      });
      if (!data.active && account?.role === "ADMIN")
        throw new ApplicationError(
          "Contas administrativas não podem ser arquivadas pela gestão de funcionários",
          "CONFLICT",
        );
      await tx.professional.update({ where: { id }, data });
      if (!data.active && account)
        await tx.session.deleteMany({ where: { userId: account.id } });
    });
  }
}
