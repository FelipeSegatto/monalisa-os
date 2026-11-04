import { ConfigurationError } from "./shared/configuration/configuration-error";
import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { RuntimeConfiguration } from "./configuration/runtime-configuration";
import { AuthConfiguration } from "./auth/presentation/auth.configuration";
async function bootstrap() {
  const runtime = RuntimeConfiguration.fromEnvironment(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  const auth = app.get(AuthConfiguration);
  app.enableCors({
    origin: [...auth.origins],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  app.enableShutdownHooks();
  await app.listen(runtime.port, "0.0.0.0");
  Logger.log(`API NestJS ativa na porta ${runtime.port}`, "Bootstrap");
}
bootstrap().catch((error) => {
  // Configuration errors contain field names only; do not log DB URLs or stack traces.
  const safe =
    error instanceof ConfigurationError
      ? error.message
      : "Falha ao iniciar API. Confira configuração e conexão com MySQL.";
  Logger.error(safe, "Bootstrap");
  process.exitCode = 1;
});
