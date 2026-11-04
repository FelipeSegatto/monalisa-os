import { ConfigurationError } from "../../shared/configuration/configuration-error";
import { AuthError } from "../domain/auth-error";
export class AuthConfiguration {
  private constructor(
    readonly origins: readonly string[],
    readonly secureCookie: boolean,
  ) {
    Object.freeze(this);
  }
  static fromEnvironment(env: NodeJS.ProcessEnv): AuthConfiguration {
    const production = env.NODE_ENV === "production";
    if (
      env.NODE_ENV &&
      !["development", "test", "production"].includes(env.NODE_ENV)
    )
      throw new ConfigurationError(
        "NODE_ENV deve ser development, test ou production",
      );
    if (env.COOKIE_SECURE && !["true", "false"].includes(env.COOKIE_SECURE))
      throw new ConfigurationError("COOKIE_SECURE deve ser true ou false");
    if (production && env.COOKIE_SECURE !== "true")
      throw new ConfigurationError("Produção exige COOKIE_SECURE=true e HTTPS");
    if (production && !env.CORS_ORIGIN)
      throw new ConfigurationError("Produção exige CORS_ORIGIN explícita");
    const origins = (env.CORS_ORIGIN || "http://localhost:5199")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!origins.length)
      throw new ConfigurationError(
        "CORS_ORIGIN deve conter ao menos uma origem",
      );
    for (const origin of origins) {
      let valid = false;
      try {
        const url = new URL(origin);
        valid =
          ["http:", "https:"].includes(url.protocol) &&
          url.origin === origin &&
          (!production || url.protocol === "https:");
      } catch {
        /* sanitized error below */
      }
      if (!valid)
        throw new ConfigurationError(
          "CORS_ORIGIN deve conter origens HTTP(S) sem caminhos; HTTPS obrigatório em produção",
        );
    }
    return new AuthConfiguration(
      Object.freeze([...new Set(origins)]),
      env.COOKIE_SECURE === "true",
    );
  }
  assertOrigin(method: string, origin: string): void {
    if (
      origin &&
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      !this.origins.includes(origin)
    )
      throw new AuthError("FORBIDDEN", "Origem não permitida");
  }
}
