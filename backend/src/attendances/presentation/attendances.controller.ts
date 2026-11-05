import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { z } from "zod";
import { parse, requiredId } from "../../common/util";
import { AttendanceService } from "../application/attendance.service";
const id = z.number().int().positive();
const execution = z.object({
  entitlementId: id.nullable().optional(),
  procedureId: id,
  variationId: id.nullable().optional(),
  professionalId: id,
  equipmentId: id.nullable().optional(),
  materials: z
    .array(
      z.object({
        stockItemId: id,
        usage: z.enum(["USED", "SMALL", "NOT_USED"]),
      }),
    )
    .max(100),
  shots: z
    .array(
      z.object({
        componentId: id.nullable().optional(),
        quantity: z.number().int().positive().max(2147483647),
      }),
    )
    .max(100),
});
@Controller("api/v1")
export class AttendancesController {
  constructor(
    @Inject(AttendanceService) private readonly service: AttendanceService,
  ) {}
  @Post("agenda/:id/attendance") start(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.service.start(requiredId(id), req.actor);
  }
  @Get("attendances/:id") detail(@Param("id") id: string, @Req() req: any) {
    return this.service.detail(requiredId(id), req.actor);
  }
  @Post("attendances/:id/cancellation") cancel(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({ reason: z.string().trim().min(3).max(1000) }),
      body,
    );
    return this.service.cancel(requiredId(id), p.reason, req.actor);
  }
  @Post("attendances/:id/completion") complete(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const input = parse(
      z.object({
        requestKey: z.string().uuid(),
        completedAt: z.string().datetime({ offset: true }).optional(),
        executions: z.array(execution).min(1).max(30),
      }),
      body,
    );
    return this.service.complete(requiredId(id), input, req.actor);
  }
}
