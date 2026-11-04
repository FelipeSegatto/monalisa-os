import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
/** One Nest provider instance shared by legacy domains and the equipment module. */
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
