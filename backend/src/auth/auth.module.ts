import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { UserRepository, SessionRepository } from "./domain/auth.repositories";
import { AuthService } from "./application/auth.service";
import { SessionService } from "./application/session.service";
import {
  AuthClock,
  PasswordHasher,
  SessionTokenCodec,
  LoginAttemptLimiter,
} from "./application/auth.ports";
import {
  PrismaUserRepository,
  PrismaSessionRepository,
} from "./infrastructure/prisma-auth.repositories";
import { ScryptPasswordHasher } from "./infrastructure/scrypt-password-hasher";
import { CryptoSessionTokens } from "./infrastructure/crypto-session-tokens";
import { MemoryLoginAttemptLimiter } from "./infrastructure/memory-login-attempt-limiter";
import { SystemAuthClock } from "./infrastructure/system-auth-clock";
import { AuthController } from "./presentation/auth.controller";
import { AuthConfiguration } from "./presentation/auth.configuration";
import { SessionGuard } from "./presentation/session.guard";
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    { provide: AuthClock, useClass: SystemAuthClock },
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
    { provide: SessionTokenCodec, useClass: CryptoSessionTokens },
    { provide: LoginAttemptLimiter, useClass: MemoryLoginAttemptLimiter },
    {
      provide: AuthConfiguration,
      useFactory: () => AuthConfiguration.fromEnvironment(process.env),
    },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [AuthService, SessionService, AuthConfiguration],
})
export class AuthModule {}
