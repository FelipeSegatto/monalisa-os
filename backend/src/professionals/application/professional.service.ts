import { Inject, Injectable } from "@nestjs/common";
import { ApplicationError } from "../../shared/domain/application-error";
import { Professional, ProfessionalData } from "../domain/professional";
import { ProfessionalRepository } from "../domain/professional.repository";
import { ProfessionalQueries } from "./professional.queries";
import { ProfessionalAccounts } from "./professional-accounts";
@Injectable()
export class ProfessionalService {
  constructor(
    @Inject(ProfessionalRepository)
    private readonly repository: ProfessionalRepository,
    @Inject(ProfessionalQueries) private readonly queries: ProfessionalQueries,
    @Inject(ProfessionalAccounts)
    private readonly accounts: ProfessionalAccounts,
  ) {}
  private async requireProfessional(id: number) {
    const professional = await this.repository.find(id);
    if (!professional)
      throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
    return professional;
  }
  list() {
    return this.queries.list();
  }
  detail(id: number) {
    return this.queries.detail(id);
  }
  async create(data: ProfessionalData) {
    const id = await this.repository.create(Professional.create(data));
    return this.queries.detail(id);
  }
  async update(id: number, data: ProfessionalData) {
    const professional = await this.requireProfessional(id);
    professional.updateProfile(data);
    await this.repository.save(professional);
    return this.queries.detail(id);
  }
  async account(id: number) {
    await this.requireProfessional(id);
    return this.accounts.find(id);
  }
  async configureAccount(id: number, email: string, password: string) {
    await this.requireProfessional(id);
    return this.accounts.configure(id, email, password);
  }
}
