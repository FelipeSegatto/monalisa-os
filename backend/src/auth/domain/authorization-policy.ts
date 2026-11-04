import { Actor } from "./actor";
import { AuthError } from "./auth-error";
/** Existing coarse-grained policy only; resource scopes stay in their current domains. */
export class AuthorizationPolicy {
  static requireAdministrator(actor: Actor): void {
    if (actor.role !== "ADMIN")
      throw new AuthError("FORBIDDEN", "Acesso restrito a administradores");
  }
}
