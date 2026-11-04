/** Atomic credentials replacement + session revocation for a professional identity. */
export abstract class EmployeeAccountRepository {
  abstract find(professionalId: number): Promise<{ email: string } | null>;
  abstract provision(
    professionalId: number,
    email: string,
    passwordHash: string,
  ): Promise<void>;
}
