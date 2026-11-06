import { queryDay } from "../../shared/presentation/listing-query";
import { Req } from "@nestjs/common";
import { InventoryService } from "../application/inventory.service";
import { StockBalance } from "../domain/stock-balance";
import { nearestExpiry } from "../domain/stock-expiry";
import {
  Inject,
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { Admin } from "../../auth/auth.guard";
import { dateKey, iso, parse, required, requiredId } from "../../common/util";
import { z } from "zod";
const input = z.object({
  name: z.string().trim().min(2).max(150),
  unit: z.string().trim().min(1).max(30),
  minQuantity: z.number().nonnegative(),
  active: z.boolean().optional(),
  initialQuantity: z.number().nonnegative().optional(),
});
const EXPIRY_INCLUDE = {
  movements: {
    where: { type: "IN" as const, expiresAt: { not: null } },
    select: { expiresAt: true, reversal: { select: { id: true } } },
  },
};
const itemOut = (s: any) => ({
  id: s.id,
  name: s.name,
  unit: s.unit,
  quantity: String(s.quantity),
  minQuantity: String(s.minQuantity),
  active: s.active,
  isLow: Number(s.quantity) <= Number(s.minQuantity),
  expiry:
    s.active && Number(s.quantity) > 0
      ? nearestExpiry(s.movements, dateKey(new Date()))
      : null,
});
@Controller("api/v1/stock")
export class StockController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}
  @Get("items") async list() {
    const data = await this.db.stockItem.findMany({
      orderBy: { name: "asc" },
      include: EXPIRY_INCLUDE,
    });
    return { items: data.map(itemOut) };
  }
  @Get("items/:id") async detail(@Param("id") id: string) {
    const s = required(
      await this.db.stockItem.findUnique({
        where: { id: requiredId(id) },
        include: {
          movements: {
            orderBy: { createdAt: "desc" },
            include: { reversal: { select: { id: true } } },
          },
        },
      }),
    );
    return {
      ...itemOut(s),
      movements: s.movements.map((m) => ({
        id: m.id,
        type: m.type,
        actorId: m.actorId,
        reversesId: m.reversesId,
        quantityDelta: String(m.quantityDelta),
        note: m.note,
        expiresAt: m.expiresAt ? m.expiresAt.toISOString().slice(0, 10) : null,
        createdAt: iso(m.createdAt),
      })),
    };
  }
  @Admin() @Post("items") async create(@Body() body: unknown, @Req() req: any) {
    const { initialQuantity = 0, ...p } = parse(input, body);
    StockBalance.units(initialQuantity);
    StockBalance.units(p.minQuantity);
    const s = await this.db.stockItem.create({
      data: {
        ...p,
        quantity: initialQuantity,
        movements: initialQuantity
          ? {
              create: {
                type: "IN",
                quantityDelta: initialQuantity,
                note: "Saldo inicial",
                actorId: req.actor.id,
              },
            }
          : undefined,
      },
    });
    return itemOut(s);
  }
  @Admin() @Put("items/:id") async update(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { initialQuantity, ...p } = parse(input, body);
    StockBalance.units(p.minQuantity);
    const s = await this.db.stockItem.update({
      where: { id: requiredId(id) },
      data: p,
    });
    return itemOut(s);
  }
  @Admin() @Post("items/:id/movements") async movement(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({
        type: z.enum(["IN", "ADJUSTMENT", "CONSUMPTION"]),
        quantity: z.number().finite(),
        note: z.string().trim().min(3).max(255),
        requestKey: z.string().uuid(),
        expiresAt: queryDay.nullable().optional(),
      }),
      body,
    );
    await this.inventory.post(requiredId(id), { ...p, actorId: req.actor.id });
    return this.detail(id);
  }
  @Admin() @Post("movements/:id/reversal") async reversal(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({
        note: z.string().trim().min(3).max(255),
        requestKey: z.string().uuid(),
      }),
      body,
    );
    return this.inventory.reverse(
      requiredId(id),
      p.note,
      p.requestKey,
      req.actor.id,
    );
  }
}
