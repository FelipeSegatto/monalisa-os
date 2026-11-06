import { SaleListFilters } from "../application/commercial.repository";
import { Inject, Injectable } from "@nestjs/common";
import { Actor } from "../../auth/domain/actor";
import { ApplicationError } from "../../shared/domain/application-error";
import { CommercialRepository } from "../application/commercial.repository";
import { OfferVersionInput } from "../domain/commercial-offer";
import { SaleInput } from "../domain/sale";
import { Money, allocate } from "../domain/money";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
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
    @Inject(PrismaService) private readonly db: PrismaService,
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
  sales(
    actor: Actor,
    customerId?: number,
    before?: number,
    filters?: SaleListFilters,
  ) {
    return this.salesStore.list(actor, customerId, before, filters);
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
  /** Monthly sold/received time series per offer (combo), from items actually purchased as part of that offer. */
  async offerSeries(months: number, actor: Actor) {
    if (actor.role === "FUNCIONARIO") return { months: [], offers: [] };
    const n = Math.max(1, Math.min(24, months));
    const now = new Date();
    const windows: { key: string; start: Date; end: Date }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 3),
      );
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      windows.push({ key: start.toISOString().slice(0, 7), start, end });
    }
    const offerInclude = {
      offerPurchase: { include: { version: { include: { offer: true } } } },
    } as const;
    const perMonth = await Promise.all(
      windows.map(async (w) => {
        const bucket = new Map<
          number,
          {
            offerId: number;
            offerName: string;
            soldCents: number;
            receivedCents: number;
          }
        >();
        const get = (offerId: number, offerName: string) => {
          let row = bucket.get(offerId);
          if (!row) {
            row = { offerId, offerName, soldCents: 0, receivedCents: 0 };
            bucket.set(offerId, row);
          }
          return row;
        };
        const sales = await this.db.sale.findMany({
          where: { createdAt: { gte: w.start, lt: w.end }, cancelled: false },
          include: { items: { include: offerInclude } },
        });
        for (const sale of sales)
          for (const item of sale.items) {
            const offer = item.offerPurchase?.version.offer;
            if (!offer) continue;
            const cents =
              item.netAmount != null
                ? Money.from(item.netAmount.toString()).cents
                : Money.from(item.finalPrice.toString()).cents;
            get(offer.id, offer.name).soldCents += cents;
          }
        const payments = await this.db.salePayment.findMany({
          where: { paidAt: { gte: w.start, lt: w.end } },
          include: {
            reversal: true,
            sale: { include: { items: { include: offerInclude } } },
          },
        });
        for (const payment of payments) {
          if (payment.reversal) continue;
          const items = payment.sale.items;
          const weights = items.map((i) =>
            i.netAmount != null
              ? Money.from(i.netAmount.toString()).cents
              : Money.from(i.finalPrice.toString()).cents,
          );
          if (!weights.reduce((a, b) => a + b, 0)) continue;
          const shares = allocate(
            Money.from(payment.amount.toString()).cents,
            weights,
          );
          items.forEach((item, index) => {
            const offer = item.offerPurchase?.version.offer;
            if (!offer) return;
            get(offer.id, offer.name).receivedCents += shares[index];
          });
        }
        return [...bucket.values()];
      }),
    );
    const offerIds = new Map<number, string>();
    for (const rows of perMonth)
      for (const r of rows) offerIds.set(r.offerId, r.offerName);
    const offers = [...offerIds.entries()].map(([offerId, offerName]) => {
      const sold: number[] = [],
        received: number[] = [];
      for (const rows of perMonth) {
        const r = rows.find((x) => x.offerId === offerId);
        sold.push((r?.soldCents ?? 0) / 100);
        received.push((r?.receivedCents ?? 0) / 100);
      }
      return { offerId, offerName, sold, received };
    });
    return { months: windows.map((w) => w.key), offers };
  }
}
