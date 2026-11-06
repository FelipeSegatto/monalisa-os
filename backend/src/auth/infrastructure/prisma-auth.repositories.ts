import { AuthError } from "../domain/auth-error";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { UserRepository, SessionRepository } from "../domain/auth.repositories";
import { AuthUser } from "../domain/auth-user";
import { AuthSession } from "../domain/auth-session";
@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.db.user.findUnique({
      where: { email },
      include: { professional: { select: { active: true } } },
    });
    return user && user.professional?.active !== false
      ? AuthUser.restore(user)
      : null;
  }
}
@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async create(
    tokenHash: string,
    userId: number,
    expiresAt: number,
    expectedPasswordHash: string,
  ): Promise<void> {
    const data = { tokenHash, userId, expiresAt: new Date(expiresAt) };
    await this.db.$transaction(async (tx) => {
      const [user] = await tx.$queryRaw<
        Array<{
          id: number;
          passwordHash: string;
          professionalActive: boolean | number | null;
        }>
      >`SELECT u.id, u.passwordHash, p.active AS professionalActive FROM \`User\` u LEFT JOIN Professional p ON p.id = u.professionalId WHERE u.id = ${userId} FOR UPDATE`;
      if (
        !user ||
        user.passwordHash !== expectedPasswordHash ||
        user.professionalActive === false ||
        user.professionalActive === 0
      )
        throw new AuthError("INVALID_CREDENTIALS", "Email ou senha inválidos");
      await tx.session.create({ data });
    });
  }

  async findByHash(tokenHash: string): Promise<AuthSession | null> {
    const session = await this.db.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            professionalId: true,
            professional: { select: { active: true } },
          },
        },
      },
    });
    return session && session.user.professional?.active !== false
      ? AuthSession.restore(session.user, session.expiresAt.getTime())
      : null;
  }
  async deleteByHash(tokenHash: string): Promise<void> {
    await this.db.session.deleteMany({ where: { tokenHash } });
  }
}
