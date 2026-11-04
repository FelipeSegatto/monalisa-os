export type Role = "ADMIN" | "FUNCIONARIO";
export interface Actor {
  id: number;
  name: string;
  role: Role;
  professionalId: number | null;
}
