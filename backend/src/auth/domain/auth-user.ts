import { Actor, Role } from "./actor";
export interface AuthUserData {
  id: number;
  name: string;
  email: string;
  role: Role;
  professionalId: number | null;
  passwordHash: string;
}
/** Account identity, independent of HTTP and ORM. Never serialized as an API response. */
export class AuthUser {
  private readonly data: Readonly<AuthUserData>;
  private constructor(data: AuthUserData) {
    if (
      !Number.isSafeInteger(data.id) ||
      data.id < 1 ||
      !["ADMIN", "FUNCIONARIO"].includes(data.role)
    )
      throw new Error("Identidade de usuário inválida");
    this.data = Object.freeze({ ...data });
  }
  static restore(data: AuthUserData): AuthUser {
    return new AuthUser(data);
  }
  get id(): number {
    return this.data.id;
  }
  get passwordHash(): string {
    return this.data.passwordHash;
  }
  toActor(): Actor {
    return {
      id: this.data.id,
      name: this.data.name,
      role: this.data.role,
      professionalId: this.data.professionalId,
    };
  }
  publicProfile(): { id: number; name: string; email: string } {
    return { id: this.data.id, name: this.data.name, email: this.data.email };
  }
  toJSON(): object {
    return this.publicProfile();
  }
}
