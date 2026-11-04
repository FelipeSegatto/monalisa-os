import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { resolve } from "node:path";
import { hashToken } from "../../src/auth/security";

/** Real Nest routes/guards, simulated persistence. Run against source and emitted JS. */
export async function contractApp() {
  const compiled = process.env.CONTRACT_RUNTIME === "compiled";
  const prefix = resolve(__dirname, compiled ? "../../dist/src" : "../../src");
  const suffix = compiled ? ".js" : ".ts";
  const { AppModule } = require(resolve(prefix, `app.module${suffix}`));
  const { PrismaService } = require(
    resolve(prefix, `shared/infrastructure/prisma/prisma.service${suffix}`),
  );
  const init = PrismaService.prototype.onModuleInit,
    destroy = PrismaService.prototype.onModuleDestroy;
  PrismaService.prototype.onModuleInit = async function () {};
  PrismaService.prototype.onModuleDestroy = async function () {};
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  try {
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    const db: any = app.get(PrismaService);
    const admin = "a".repeat(64),
      staff = "b".repeat(64);
    db.session.findUnique = async ({ where }: any) => {
      if (![hashToken(admin), hashToken(staff)].includes(where.tokenHash))
        return null;
      return {
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: where.tokenHash === hashToken(admin) ? 7 : 8,
          name: "Pessoa de teste",
          role: where.tokenHash === hashToken(admin) ? "ADMIN" : "FUNCIONARIO",
          professionalId: where.tokenHash === hashToken(admin) ? null : 1,
        },
      };
    };
    const close = async () => {
      try {
        await app?.close();
      } finally {
        PrismaService.prototype.onModuleInit = init;
        PrismaService.prototype.onModuleDestroy = destroy;
      }
    };
    return {
      db,
      async start() {
        await app!.listen(0, "127.0.0.1");
      },
      async request(
        path: string,
        options: {
          method?: string;
          body?: unknown;
          headers?: Record<string, string>;
          role?: "ADMIN" | "FUNCIONARIO" | "ANONYMOUS";
        } = {},
      ) {
        const port = app!.getHttpServer().address().port;
        const token =
          options.role === "ANONYMOUS"
            ? null
            : options.role === "FUNCIONARIO"
              ? staff
              : admin;
        return fetch(`http://127.0.0.1:${port}${path}`, {
          method: options.method || "GET",
          headers: {
            ...(token ? { cookie: `clinic_session=${token}` } : {}),
            ...(options.body !== undefined
              ? { "content-type": "application/json" }
              : {}),
            ...options.headers,
          },
          ...(options.body !== undefined
            ? { body: JSON.stringify(options.body) }
            : {}),
        });
      },
      close,
    };
  } catch (error) {
    try {
      await app?.close();
    } finally {
      PrismaService.prototype.onModuleInit = init;
      PrismaService.prototype.onModuleDestroy = destroy;
    }
    throw error;
  }
}
