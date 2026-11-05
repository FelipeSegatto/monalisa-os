import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { z } from "zod";
import { Admin } from "../../auth/presentation/auth.decorators";
import { parse, requiredId } from "../../common/util";
import { ShotLedgerService } from "../application/shot-ledger.service";
const key = z.string().uuid();
@Controller("api/v1")
export class ShotLedgerController {
  constructor(
    @Inject(ShotLedgerService) private readonly ledger: ShotLedgerService,
  ) {}
  @Get("equipment/:id/shot-counters") counters(@Param("id") id: string) {
    return this.ledger.counters(requiredId(id));
  }
  @Get("equipment/:id/shot-ledger") entries(
    @Param("id") id: string,
    @Query("before") before?: string,
  ) {
    return this.ledger.entries(
      requiredId(id),
      before ? requiredId(before) : undefined,
    );
  }
  @Admin() @Post("equipment/:id/shot-ledger") post(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({
        componentId: z.number().int().positive().nullable().default(null),
        quantityDelta: z.number().int().min(-2147483647).max(2147483647),
        type: z.enum(["OPENING", "ADJUSTMENT"]),
        reason: z.string().trim().min(3).max(1000),
        requestKey: key,
      }),
      body,
    );
    return this.ledger.post({
      ...p,
      equipmentId: requiredId(id),
      actorId: req.actor.id,
    });
  }
  @Admin() @Post("shot-ledger/:id/correction") correct(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({
        quantity: z.number().int().positive().max(2147483647),
        reason: z.string().trim().min(3).max(1000),
        requestKey: key,
      }),
      body,
    );
    return this.ledger.correct(
      requiredId(id),
      p.quantity,
      p.reason,
      p.requestKey,
      req.actor.id,
    );
  }
  @Admin() @Post("shot-ledger/:id/reversal") reverse(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({ reason: z.string().trim().min(3).max(1000), requestKey: key }),
      body,
    );
    return this.ledger.reverse(
      requiredId(id),
      p.reason,
      p.requestKey,
      req.actor.id,
    );
  }
}
