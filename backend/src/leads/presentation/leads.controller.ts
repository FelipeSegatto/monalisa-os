import {
  Inject,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
} from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { Public } from "../../auth/auth.guard";
import { iso, parse, requiredId } from "../../common/util";
import { z } from "zod";
const leadInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  procedureCategoryId: z.number().int().positive().nullable(),
  message: z.string().max(2000).nullable(),
});
const leadMap = (l: any) => ({
  ...l,
  createdAt: iso(l.createdAt),
  procedureCategoryName: l.procedureCategory?.name || null,
});
@Controller("api/v1")
export class LeadsController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  @Public() @Post("public/leads") async create(@Body() body: unknown) {
    const p = parse(leadInput, body);
    return leadMap(
      await this.db.lead.create({
        data: p,
        include: { procedureCategory: true },
      }),
    );
  }
  @Get("leads") async list() {
    const all = await this.db.lead.findMany({
      include: { procedureCategory: true },
      orderBy: { createdAt: "desc" },
    });
    return { leads: all.map(leadMap) };
  }
  @Patch("leads/:id/status") async status(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const p = parse(z.object({ status: z.enum(["NEW", "CONTACTED"]) }), body);
    return leadMap(
      await this.db.lead.update({
        where: { id: requiredId(id) },
        data: { status: p.status },
        include: { procedureCategory: true },
      }),
    );
  }
}
