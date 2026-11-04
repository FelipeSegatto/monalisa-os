import { Inject, Injectable } from "@nestjs/common";
import { EmployeeCredentials } from "../domain/employee-credentials";
import { EmployeeAccountRepository } from "../domain/employee-account.repository";
import { PasswordHasher } from "./auth.ports";
@Injectable()
export class EmployeeAccountService {
  constructor(
    @Inject(EmployeeAccountRepository)
    private readonly repository: EmployeeAccountRepository,
    @Inject(PasswordHasher) private readonly passwords: PasswordHasher,
  ) {}
  async find(professionalId: number) {
    const account = await this.repository.find(professionalId);
    return { hasAccount: !!account, email: account?.email ?? null };
  }
  async configure(professionalId: number, email: string, password: string) {
    const credentials = EmployeeCredentials.from(email, password);
    const hash = await this.passwords.hash(credentials.revealPassword());
    await this.repository.provision(professionalId, credentials.email, hash);
    return this.find(professionalId);
  }
}
