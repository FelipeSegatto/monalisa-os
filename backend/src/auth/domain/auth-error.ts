import { ApplicationError } from "../../shared/domain/application-error";
export type AuthFailure =
  | "MISSING_SESSION"
  | "EXPIRED_SESSION"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "FORBIDDEN";
export class AuthError extends ApplicationError {
  constructor(
    readonly kind: AuthFailure,
    message: string,
  ) {
    super(message, kind === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHENTICATED");
    this.name = "AuthError";
  }
}
