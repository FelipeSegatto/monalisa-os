import { Inject, Injectable } from "@nestjs/common";
import { AuthClock, LoginAttemptLimiter } from "../application/auth.ports";
import { LoginAttemptWindow } from "../domain/login-attempt-window";
/** Single-process protection, with expiry and bounded memory; not distributed. */
@Injectable()
export class MemoryLoginAttemptLimiter extends LoginAttemptLimiter {
  private readonly windows = new Map<string, LoginAttemptWindow>();
  private nextCleanup = 0;
  private readonly capacity = 10000;
  constructor(@Inject(AuthClock) private readonly clock: AuthClock) {
    super();
  }
  private cleanup(now: number): void {
    if (now < this.nextCleanup) return;
    for (const [key, window] of this.windows)
      if (window.isExpired(now)) this.windows.delete(key);
    this.nextCleanup = now + 60000;
  }
  assertAllowed(key: string): void {
    const now = this.clock.now();
    this.cleanup(now);
    const window = this.windows.get(key);
    if (window?.isExpired(now)) this.windows.delete(key);
    else window?.assertAllowed(now);
  }
  failed(key: string): void {
    const now = this.clock.now();
    this.cleanup(now);
    let window = this.windows.get(key);
    if (!window || window.isExpired(now)) {
      this.windows.delete(key);
      if (this.windows.size >= this.capacity)
        this.windows.delete(this.windows.keys().next().value!);
      window = new LoginAttemptWindow(now + 15 * 60000);
      this.windows.set(key, window);
    }
    window.fail();
  }
  succeeded(key: string): void {
    this.windows.delete(key);
  }
}
