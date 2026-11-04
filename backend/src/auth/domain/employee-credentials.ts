import { ApplicationError } from "../../shared/domain/application-error";
import { ContactEmail } from "../../shared/domain/contact-email";
export class EmployeeCredentials {
  #password: string;
  private constructor(
    readonly email: string,
    password: string,
  ) {
    this.#password = password;
    Object.freeze(this);
  }
  static from(email: string, password: string): EmployeeCredentials {
    if (
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 200
    )
      throw new ApplicationError(
        "Senha deve ter entre 10 e 200 caracteres",
        "INVALID_INPUT",
      );
    return new EmployeeCredentials(
      ContactEmail.from(email).toString().toLowerCase(),
      password,
    );
  }
  revealPassword(): string {
    return this.#password;
  }
  toJSON(): object {
    return { email: this.email, password: "[redacted]" };
  }
}
