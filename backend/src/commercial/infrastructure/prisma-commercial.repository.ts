import { Inject, Injectable } from "@nestjs/common";
import { Actor } from "../../auth/domain/actor";
import { ApplicationError } from "../../shared/domain/application-error";
import { CommercialRepository } from "../application/commercial.repository";
import { OfferVersionInput } from "../domain/commercial-offer";
import { SaleInput } from "../domain/sale";
import { PrismaOfferCatalog } from "./prisma-offer-catalog";
import { PrismaCommercialSales } from "./prisma-commercial-sales";
import { PrismaSessionLedger } from "./prisma-session-ledger";
@Injectable()
export class PrismaCommercialRepository extends CommercialRepository {
  constructor(
    @Inject(PrismaOfferCatalog) private readonly catalog: PrismaOfferCatalog,
    @Inject(PrismaCommercialSales)
    private readonly salesStore: PrismaCommercialSales,
    @Inject(PrismaSessionLedger) private readonly sessions: PrismaSessionLedger,
  ) {
    super();
  }
  private admin(actor: Actor) {
    if (actor.role !== "ADMIN")
      throw new ApplicationError(
        "Operação exclusiva de administrador",
        "FORBIDDEN",
      );
  }
  attachSession(...a: Parameters<PrismaSessionLedger["attach"]>) {
    return this.sessions.attach(...a);
  }
  offers(id?: number) {
    return this.catalog.list(id);
  }
  offer(id: number) {
    return this.catalog.detail(id);
  }
  publish(id: number | null, input: OfferVersionInput, actor: Actor) {
    this.admin(actor);
    return this.catalog.publish(id, input, actor);
  }
  setOfferActive(id: number, active: boolean, reason: string, actor: Actor) {
    this.admin(actor);
    return this.catalog.setActive(id, active, reason, actor);
  }
  sales(actor: Actor, customerId?: number, before?: number) {
    return this.salesStore.list(actor, customerId, before);
  }
  sale(id: number, actor: Actor) {
    return this.salesStore.detail(id, actor);
  }
  createSale(input: SaleInput, actor: Actor) {
    return this.salesStore.create(input, actor);
  }
  legacyCreate(input: any, actor: Actor) {
    return this.salesStore.legacyCreate(input, actor);
  }
  payment(...a: Parameters<PrismaCommercialSales["pay"]>) {
    return this.salesStore.pay(...a);
  }
  reversePayment(id: number, reason: string, key: string, actor: Actor) {
    this.admin(actor);
    return this.salesStore.reversePayment(id, reason, key, actor);
  }
  cancelSale(id: number, reason: string, actor: Actor) {
    this.admin(actor);
    return this.salesStore.cancel(id, reason, actor);
  }
  entitlements(customerId: number, _actor: Actor) {
    return this.sessions.list(customerId);
  }
  reverseRedemption(id: number, reason: string, key: string, actor: Actor) {
    this.admin(actor);
    return this.sessions.reverse(id, reason, key, actor);
  }
}
