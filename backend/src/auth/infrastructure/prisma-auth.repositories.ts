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
    const user = await this.db.user.findUnique({ where: { email } });
    return user ? AuthUser.restore(user) : null;
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
  ): Promise<void> {
    await this.db.session.create({
      data: { tokenHash, userId, expiresAt: new Date(expiresAt) },
    });
  }
  async findByHash(tokenHash: string): Promise<AuthSession | null> {
    const session = await this.db.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, name: true, role: true, professionalId: true },
        },
      },
    });
    return session
      ? AuthSession.restore(session.user, session.expiresAt.getTime())
      : null;
  }
  async deleteByHash(tokenHash: string): Promise<void> {
    await this.db.session.deleteMany({ where: { tokenHash } });
  }
}
