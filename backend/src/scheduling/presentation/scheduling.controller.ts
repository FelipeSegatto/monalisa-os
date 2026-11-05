import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { z } from "zod";
import { Admin } from "../../auth/presentation/auth.decorators";
import { parse, requiredId } from "../../common/util";
import { BookingService } from "../application/booking.service";
@Controller("api/v1/scheduling")
export class SchedulingController {
  constructor(
    @Inject(BookingService) private readonly service: BookingService,
  ) {}
  @Get("available-professionals") available(@Query() query: unknown) {
    const q = parse(
      z.object({
        excludeId: z.coerce.number().int().positive().optional(),
        procedureId: z.coerce.number().int().positive(),
        startsAt: z.string().datetime({ offset: true }),
        durationMinutes: z.coerce.number().int().min(1).max(720).optional(),
      }),
      query,
    );
    return this.service.available(
      q.procedureId,
      new Date(q.startsAt),
      q.durationMinutes,
      q.excludeId,
    );
  }
  @Get("settings") settings() {
    return this.service.settings();
  }
  @Admin() @Put("settings") save(@Body() body: unknown) {
    return this.service.saveSettings(
      parse(
        z.object({
          assignmentPolicy: z.enum(["PRIORITY", "MANUAL"]),
          confirmationMode: z.enum(["MANUAL", "AUTOMATIC"]),
          holdMinutes: z.number().int().min(5).max(10080),
        }),
        body,
      ),
    );
  }
  @Admin() @Patch("appointments/:id/assignment") reassign(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({ professionalId: z.number().int().positive().optional() }),
      body,
    );
    return this.service.reassign(requiredId(id), p.professionalId, req.actor);
  }
  @Patch("appointments/:id/confirmation") confirm(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({
        durationMinutes: z.number().int().min(1).max(720).optional(),
      }),
      body,
    );
    return this.service.confirm(requiredId(id), p.durationMinutes, req.actor);
  }
}
