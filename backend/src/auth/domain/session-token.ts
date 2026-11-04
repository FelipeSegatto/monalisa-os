import { AuthError } from "./auth-error";
/** Opaque browser credential. Plaintext is revealed only for hashing/cookie delivery. */
export class SessionToken {
  #value: string;
  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }
  static from(value: string | null | undefined): SessionToken {
    if (!value || !/^[a-f0-9]{64}$/.test(value))
      throw new AuthError("MISSING_SESSION", "Faça login para continuar");
    return new SessionToken(value);
  }
  reveal(): string {
    return this.#value;
  }
  toJSON(): string {
    return "[redacted]";
  }
  toString(): string {
    return "[redacted]";
  }
}
