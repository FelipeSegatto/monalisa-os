import { Actor } from "./actor";
import { AuthError } from "./auth-error";
export class AuthSession {
  private readonly actor: Readonly<Actor>;
  private constructor(
    actor: Actor,
    private readonly expiresAt: number,
  ) {
    if (!Number.isFinite(expiresAt))
      throw new Error("Expiração de sessão inválida");
    if (
      !Number.isSafeInteger(actor.id) ||
      actor.id < 1 ||
      !["ADMIN", "FUNCIONARIO"].includes(actor.role)
    )
      throw new Error("Identidade de sessão inválida");
    this.actor = Object.freeze({
      id: actor.id,
      name: actor.name,
      role: actor.role,
      professionalId: actor.professionalId,
    });
    Object.freeze(this);
  }
  static restore(actor: Actor, expiresAt: number): AuthSession {
    return new AuthSession(actor, expiresAt);
  }
  authenticate(now: number): Actor {
    if (this.expiresAt <= now)
      throw new AuthError("EXPIRED_SESSION", "Sessão expirada");
    return { ...this.actor };
  }
}
