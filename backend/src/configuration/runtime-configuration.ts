import { ConfigurationError } from "../shared/configuration/configuration-error";
import { AuthConfiguration } from "../auth/presentation/auth.configuration";
/** Fail-fast checks for the executable entry point, without printing secrets. */
export class RuntimeConfiguration {
  private constructor(
    readonly port: number,
    readonly auth: AuthConfiguration,
  ) {}
  static fromEnvironment(env: NodeJS.ProcessEnv): RuntimeConfiguration {
    const port = Number(env.PORT || 3333);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new ConfigurationError("PORT deve ser um inteiro entre 1 e 65535");
    let valid = false;
    try {
      const url = new URL(env.DATABASE_URL || "");
      valid =
        url.protocol === "mysql:" && !!url.hostname && url.pathname.length > 1;
    } catch {
      /* never interpolate DATABASE_URL */
    }
    if (!valid)
      throw new ConfigurationError(
        "DATABASE_URL MySQL é obrigatória e deve identificar um banco",
      );
    return new RuntimeConfiguration(
      port,
      AuthConfiguration.fromEnvironment(env),
    );
  }
}
