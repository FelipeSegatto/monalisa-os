import { saleListInput } from "./commercial.schemas";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { z } from "zod";
import { Admin } from "../../auth/presentation/auth.decorators";
import { parse, requiredId } from "../../common/util";
import { CommercialService } from "../application/commercial.service";
import {
  versionInput,
  saleInput,
  paymentInput,
  reason,
} from "./commercial.schemas";
@Controller("api/v1/commercial")
export class CommercialController {
  constructor(
    @Inject(CommercialService) private readonly service: CommercialService,
  ) {}
  @Get("offers") offers(@Query("procedureId") id?: string) {
    return this.service.offers(id ? requiredId(id) : undefined);
  }
  @Admin() @Get("offer-series") offerSeries(
    @Query("months") months: string | undefined,
    @Req() req: any,
  ) {
    return this.service.offerSeries(Number(months) || 6, req.actor);
  }
  @Get("offers/:id") offer(@Param("id") id: string) {
    return this.service.offer(requiredId(id));
  }
  @Admin() @Post("offers") createOffer(@Body() body: unknown, @Req() req: any) {
    return this.service.publish(null, parse(versionInput, body), req.actor);
  }
  @Admin() @Post("offers/:id/versions") publish(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    return this.service.publish(
      requiredId(id),
      parse(versionInput, body),
      req.actor,
    );
  }
  @Admin() @Patch("offers/:id/state") state(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(z.object({ active: z.boolean(), reason }), body);
    return this.service.setOfferActive(
      requiredId(id),
      p.active,
      p.reason,
      req.actor,
    );
  }
  @Get("sales") sales(@Query() query: unknown, @Req() req: any) {
    const { customerId, before, ...filters } = parse(saleListInput, query);
    return this.service.sales(req.actor, customerId, before, filters);
  }
  @Get("sales/:id") sale(@Param("id") id: string, @Req() req: any) {
    return this.service.sale(requiredId(id), req.actor);
  }
  @Post("sales") createSale(@Body() body: unknown, @Req() req: any) {
    return this.service.createSale(parse(saleInput, body), req.actor);
  }
  @Post("sales/:id/payments") payment(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    return this.service.payment(
      requiredId(id),
      parse(paymentInput, body),
      req.actor,
    );
  }
  @Admin() @Post("payments/:id/reversal") reversePayment(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(z.object({ reason, requestKey: z.string().uuid() }), body);
    return this.service.reversePayment(
      requiredId(id),
      p.reason,
      p.requestKey,
      req.actor,
    );
  }
  @Admin() @Post("sales/:id/cancellation") cancel(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(z.object({ reason }), body);
    return this.service.cancelSale(requiredId(id), p.reason, req.actor);
  }
  @Get("customers/:id/entitlements") entitlements(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.service.entitlements(requiredId(id), req.actor);
  }
  @Post("appointments/:id/session-reservation") reserve(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(
      z.object({
        entitlementId: z.number().int().positive().nullable(),
        variationId: z.number().int().positive().nullable(),
      }),
      body,
    );
    return this.service.attachSession(
      requiredId(id),
      p.entitlementId,
      p.variationId,
      req.actor,
    );
  }
  @Admin() @Post("redemptions/:id/reversal") reverseRedemption(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const p = parse(z.object({ reason, requestKey: z.string().uuid() }), body);
    return this.service.reverseRedemption(
      requiredId(id),
      p.reason,
      p.requestKey,
      req.actor,
    );
  }
}
