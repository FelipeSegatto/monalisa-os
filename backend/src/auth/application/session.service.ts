import { Inject, Injectable } from "@nestjs/common";
import { SessionRepository } from "../domain/auth.repositories";
import { SessionToken } from "../domain/session-token";
import { AuthError } from "../domain/auth-error";
import { AuthClock, SessionTokenCodec } from "./auth.ports";
export const SESSION_LIFETIME_MS = 7 * 86400000;
@Injectable()
export class SessionService {
  constructor(
    @Inject(SessionRepository) private readonly sessions: SessionRepository,
    @Inject(SessionTokenCodec) private readonly tokens: SessionTokenCodec,
    @Inject(AuthClock) private readonly clock: AuthClock,
  ) {}
  async issue(userId: number): Promise<SessionToken> {
    const token = this.tokens.generate();
    await this.sessions.create(
      this.tokens.hash(token),
      userId,
      this.clock.now() + SESSION_LIFETIME_MS,
    );
    return token;
  }
  async authenticate(raw: string | null | undefined) {
    const token = SessionToken.from(raw);
    const session = await this.sessions.findByHash(this.tokens.hash(token));
    if (!session) throw new AuthError("EXPIRED_SESSION", "Sessão expirada");
    return session.authenticate(this.clock.now());
  }
  async revoke(raw: string | null | undefined): Promise<void> {
    if (!raw) return;
    const token = SessionToken.from(raw);
    await this.sessions.deleteByHash(this.tokens.hash(token));
  }
}
