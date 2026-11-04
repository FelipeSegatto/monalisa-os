export interface ProfessionalAccountView {
  hasAccount: boolean;
  email: string | null;
}
export abstract class ProfessionalAccounts {
  abstract find(id: number): Promise<ProfessionalAccountView>;
  abstract configure(
    id: number,
    email: string,
    password: string,
  ): Promise<ProfessionalAccountView>;
}
