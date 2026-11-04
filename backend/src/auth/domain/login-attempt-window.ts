import { AuthError } from "./auth-error";
export class LoginAttemptWindow {
  private failures = 0;
  constructor(
    readonly until: number,
    private readonly maximum = 10,
  ) {}
  isExpired(now: number): boolean {
    return this.until <= now;
  }
  assertAllowed(now: number): void {
    if (!this.isExpired(now) && this.failures >= this.maximum)
      throw new AuthError(
        "RATE_LIMITED",
        "Muitas tentativas. Tente novamente depois.",
      );
  }
  fail(): void {
    this.failures++;
  }
}
