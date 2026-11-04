import { AuthUser } from "./auth-user";
import { AuthSession } from "./auth-session";
export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
}
export abstract class SessionRepository {
  abstract create(
    tokenHash: string,
    userId: number,
    expiresAt: number,
  ): Promise<void>;
  abstract findByHash(tokenHash: string): Promise<AuthSession | null>;
  abstract deleteByHash(tokenHash: string): Promise<void>;
}
