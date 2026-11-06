import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
/** One Prisma provider instance shared by the feature modules. */
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
