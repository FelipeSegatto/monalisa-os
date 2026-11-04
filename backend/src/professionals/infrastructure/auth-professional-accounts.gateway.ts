import { Inject, Injectable } from "@nestjs/common";
import { EmployeeAccountService } from "../../auth/application/employee-account.service";
import { ProfessionalAccounts } from "../application/professional-accounts";
/** Explicit collaboration: professional application never reads/writes User or Session. */
@Injectable()
export class AuthProfessionalAccounts extends ProfessionalAccounts {
  constructor(
    @Inject(EmployeeAccountService)
    private readonly accounts: EmployeeAccountService,
  ) {
    super();
  }
  find(id: number) {
    return this.accounts.find(id);
  }
  configure(id: number, email: string, password: string) {
    return this.accounts.configure(id, email, password);
  }
}
