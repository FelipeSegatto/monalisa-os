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
    await this.db.professional.update({ where: { id: id! }, data });
  }
}
