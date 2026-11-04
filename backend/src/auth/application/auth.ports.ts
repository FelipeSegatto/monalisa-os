import { SessionToken } from "../domain/session-token";
export abstract class AuthClock {
  abstract now(): number;
}
export abstract class PasswordHasher {
  abstract verify(password: string, encoded: string | null): Promise<boolean>;
}
export abstract class SessionTokenCodec {
  abstract generate(): SessionToken;
  abstract hash(token: SessionToken): string;
}
export abstract class LoginAttemptLimiter {
  abstract assertAllowed(key: string): void;
  abstract failed(key: string): void;
  abstract succeeded(key: string): void;
}
