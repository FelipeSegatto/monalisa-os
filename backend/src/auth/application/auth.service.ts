import { Inject, Injectable } from "@nestjs/common";
import { UserRepository } from "../domain/auth.repositories";
import { AuthError } from "../domain/auth-error";
import { LoginAttemptLimiter, PasswordHasher } from "./auth.ports";
import { SessionService } from "./session.service";
@Injectable()
export class AuthService {
  constructor(
    @Inject(UserRepository) private readonly users: UserRepository,
    @Inject(PasswordHasher) private readonly passwords: PasswordHasher,
    @Inject(LoginAttemptLimiter) private readonly attempts: LoginAttemptLimiter,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}
  async login(email: string, password: string, source: string) {
    this.attempts.assertAllowed(source);
    const user = await this.users.findByEmail(email.toLowerCase());
    // Unknown account still runs a password derivation, without issuing credentials.
    const matches = await this.passwords.verify(
      password,
      user?.passwordHash ?? null,
    );
    if (!user || !matches) {
      this.attempts.failed(source);
      throw new AuthError("INVALID_CREDENTIALS", "Email ou senha inválidos");
    }
    this.attempts.succeeded(source);
    const token = await this.sessions.issue(user.id);
    return { profile: user.publicProfile(), token };
  }
}
