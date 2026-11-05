import { Payment } from "../domain/payment";
import { ReceivableSchedule } from "../domain/receivable-schedule";
import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../../common/prisma.service";
import { required, dateKey } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import { Actor } from "../../auth/domain/actor";
import { Sale, SaleInput, ResolvedSaleItem } from "../domain/sale";
import { Money, allocate } from "../domain/money";
import { validDay } from "../domain/commercial-offer";
import { PrismaOfferCatalog } from "./prisma-offer-catalog";
import {
  PrismaSessionLedger,
  activeReservationWhere,
} from "./prisma-session-ledger";
export const commercialSaleInclude = {
  customer: true,
  professional: true,
  items: { include: { variation: true } },
  offerPurchases: { include: { version: true } },
  payments: {
    include: { reversal: true, allocations: true },
    orderBy: { id: "desc" as const },
  },
  discountRecords: true,
  receivables: {
    include: {
      allocations: { include: { payment: { include: { reversal: true } } } },
    },
    orderBy: { number: "asc" as const },
  },
  events: { orderBy: { id: "desc" as const }, take: 200 },
  entitlements: {
    include: {
      redemptions: {
        include: { reversal: true },
        orderBy: { id: "desc" as const },
      },
    },
  },
};
@Injectable()
export class PrismaCommercialSales {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PrismaOfferCatalog) private readonly catalog: PrismaOfferCatalog,
    @Inject(PrismaSessionLedger) private readonly sessions: PrismaSessionLedger,
  ) {}
  private authorize(s: { professionalId: number | null }, actor: Actor) {
    if (
      actor.role === "FUNCIONARIO" &&
      (!actor.professionalId || s.professionalId !== actor.professionalId)
    )
      throw new ApplicationError("Venda de outro profissional", "FORBIDDEN");
  }
  private view(s: any) {
    const subtotal = s.items.reduce(
        (n: number, i: any) => n + Money.from(String(i.finalPrice)).cents,
        0,
      ),
      total = subtotal - Money.from(String(s.discount)).cents,
      received = s.payments
        .filter((p: any) => !p.reversal)
        .reduce(
          (n: number, p: any) => n + Money.from(String(p.amount)).cents,
          0,
        );
    return {
      ...s,
      customerName: s.customer?.name ?? "",
      professionalName: s.professional?.name ?? null,
      discount: Number(s.discount),
      commissionPercent:
        s.commissionPercent === null ? null : Number(s.commissionPercent),
      subtotal: subtotal / 100,
      total: total / 100,
      received: received / 100,
      balance: (total - received) / 100,
      status: s.cancelled
        ? "CANCELLED"
        : received === 0 && total > 0
          ? "PENDING"
          : received === total
            ? "PAID"
            : "PARTIAL",
      items: s.items.map((i: any) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        finalPrice: Number(i.finalPrice),
        referenceAmount:
          i.referenceAmount === null ? null : Number(i.referenceAmount),
        promotionalDiscount:
          i.promotionalDiscount === null ? null : Number(i.promotionalDiscount),
        negotiatedDiscount:
          i.negotiatedDiscount === null ? null : Number(i.negotiatedDiscount),
        netAmount: i.netAmount === null ? null : Number(i.netAmount),
      })),
      payments: s.payments.map((p: any) => ({
        ...p,
        amount: Number(p.amount),
      })),
      discountRecords: (s.discountRecords ?? []).map((d: any) => ({
        ...d,
        value: Number(d.value),
        baseAmount: Number(d.baseAmount),
        amount: Number(d.amount),
      })),
      receivables: (s.receivables ?? []).map((r: any) => ({
        ...r,
        dueOn: r.dueOn.toISOString().slice(0, 10),
        amount: Number(r.amount),
        paid:
          r.allocations
            .filter((a: any) => !a.payment.reversal)
            .reduce(
              (n: number, a: any) => n + Money.from(String(a.amount)).cents,
              0,
            ) / 100,
      })),
    };
  }
  async detail(id: number, actor: Actor) {
    const s = required(
      await this.db.sale.findUnique({
        where: { id },
        include: commercialSaleInclude,
      }),
    );
    this.authorize(s, actor);
    return this.view(s);
  }
  async list(actor: Actor, customerId?: number, before?: number) {
    if (actor.role === "FUNCIONARIO" && !actor.professionalId)
      throw new ApplicationError("Conta sem profissional", "FORBIDDEN");
    const data = await this.db.sale.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        ...(before ? { id: { lt: before } } : {}),
        ...(actor.role === "FUNCIONARIO"
          ? { professionalId: actor.professionalId }
          : {}),
      },
      include: commercialSaleInclude,
      orderBy: { id: "desc" },
      take: 51,
    });
    return {
      sales: data.slice(0, 50).map((s) => this.view(s)),
      nextCursor: data.length > 50 ? data[49].id : null,
    };
  }
  async create(input: SaleInput, actor: Actor) {
    const normalized = {
      ...input,
      professionalId:
        actor.role === "FUNCIONARIO"
          ? actor.professionalId
          : (input.professionalId ?? null),
      allowUnpaidUse: actor.role === "ADMIN" && input.allowUnpaidUse,
    };
    if (actor.role === "FUNCIONARIO" && !actor.professionalId)
      throw new ApplicationError("Conta sem profissional", "FORBIDDEN");
    if (actor.role === "FUNCIONARIO" && input.allowUnpaidUse)
      throw new ApplicationError(
        "Somente administradores podem autorizar uso antes da quitação",
        "FORBIDDEN",
      );
    const hash = createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");
    const existing = await this.db.sale.findUnique({
      where: { requestKey: input.requestKey },
    });
    if (existing) {
      if (existing.actorId !== actor.id || existing.requestHash !== hash)
        throw new ApplicationError(
          "Chave já utilizada com outro conteúdo",
          "CONFLICT",
        );
      return this.detail(existing.id, actor);
    }
    let id: number;
    try {
      id = await this.db.$transaction(
        async (tx) => {
          required(
            await tx.customer.findUnique({ where: { id: input.customerId } }),
          );
          if (normalized.professionalId) {
            const p = required(
              await tx.professional.findUnique({
                where: { id: normalized.professionalId },
              }),
            );
            if (!p.active)
              throw new ApplicationError("Profissional inativo", "CONFLICT");
          }
          const versionIds = input.lines.flatMap((l) =>
            l.offerVersionId ? [l.offerVersionId] : [],
          );
          const versions = await tx.commercialOfferVersion.findMany({
            where: { id: { in: versionIds } },
            include: { items: true },
          });
          if (versions.length !== new Set(versionIds).size)
            throw new ApplicationError(
              "Oferta não encontrada",
              "INVALID_INPUT",
            );
          for (const offerId of [
            ...new Set(versions.map((v) => v.offerId)),
          ].sort((a, b) => a - b))
            await tx.$queryRaw`SELECT id FROM CommercialOffer WHERE id=${offerId} FOR UPDATE`;
          const procIds = [
            ...new Set([
              ...versions.flatMap((v) => v.items.map((i) => i.procedureId)),
              ...input.lines.flatMap((l) =>
                l.procedureId ? [l.procedureId] : [],
              ),
            ]),
          ].sort((a, b) => a - b);
          for (const p of procIds)
            await tx.$queryRaw`SELECT id FROM \`Procedure\` WHERE id=${p} FOR UPDATE`;
          const resolved: ResolvedSaleItem[] = [],
            purchases: {
              versionId: number;
              offerName: string;
              quantity: number;
            }[] = [];
          const now = new Date();
          for (const line of input.lines) {
            if (line.offerVersionId) {
              const v = await this.catalog.sellable(tx, line.offerVersionId),
                quantity = line.quantity ?? 1;
              if (line.discount)
                throw new ApplicationError(
                  "Desconto adicional de combo deve ser aplicado à venda",
                  "INVALID_INPUT",
                );
              for (const i of v.items)
                await this.catalog.resolveProcedure(
                  tx,
                  i.procedureId,
                  i.variationId,
                  i.sessions,
                );
              const references = v.items.map(
                (i) =>
                  Money.from(String(i.referenceUnitPrice)).times(
                    i.sessions * quantity,
                  ).cents,
              );
              const total = references.reduce((a, b) => a + b, 0),
                offered = Money.from(String(v.price)).times(quantity).cents;
              const promotion = allocate(total - offered, references),
                purchaseIndex = purchases.length;
              purchases.push({ versionId: v.id, offerName: v.name, quantity });
              v.items.forEach((i, index) =>
                resolved.push({
                  procedureId: i.procedureId,
                  variationId: i.variationId,
                  description: (
                    i.procedureName +
                    (i.variationName ? " · " + i.variationName : "")
                  ).slice(0, 255),
                  variationName: i.variationName,
                  sessions: i.sessions * quantity,
                  unitPrice: Number(i.referenceUnitPrice),
                  referenceCents: references[index],
                  promotionalCents: promotion[index],
                  offeredCents: references[index] - promotion[index],
                  expiresAt: v.sessionValidityDays
                    ? new Date(+now + v.sessionValidityDays * 86400000)
                    : null,
                  purchaseIndex,
                }),
              );
            } else {
              if (!line.procedureId)
                throw new ApplicationError(
                  "Procedimento obrigatório",
                  "INVALID_INPUT",
                );
              const i = await this.catalog.resolveProcedure(
                  tx,
                  line.procedureId,
                  line.variationId ?? null,
                  line.sessions ?? 1,
                ),
                reference = Money.from(i.referenceUnitPrice).times(
                  i.sessions,
                ).cents;
              const legacy = line as typeof line & {
                expectedUnitPrice?: number;
                agreedTotal?: number;
                discountReason?: string;
              };
              let discount = line.discount;
              if (
                legacy.expectedUnitPrice !== undefined &&
                Money.from(legacy.expectedUnitPrice).cents !==
                  Money.from(i.referenceUnitPrice).cents
              )
                throw new ApplicationError(
                  "Preço de referência alterado; atualize a venda",
                  "CONFLICT",
                );
              if (legacy.agreedTotal !== undefined) {
                const agreed = Money.from(legacy.agreedTotal).cents;
                if (agreed > reference)
                  throw new ApplicationError(
                    "Preço negociado supera referência",
                    "INVALID_INPUT",
                  );
                if (agreed < reference)
                  discount = {
                    type: "FIXED",
                    value: (reference - agreed) / 100,
                    reason: legacy.discountReason ?? "",
                  };
              }
              resolved.push({
                procedureId: i.procedureId,
                variationId: i.variationId,
                description: (
                  i.procedureName +
                  (i.variationName ? " · " + i.variationName : "")
                ).slice(0, 255),
                variationName: i.variationName,
                sessions: i.sessions,
                unitPrice: i.referenceUnitPrice,
                referenceCents: reference,
                promotionalCents: 0,
                offeredCents: reference,
                discount,
                expiresAt: line.sessionValidityDays
                  ? new Date(+now + line.sessionValidityDays * 86400000)
                  : null,
                purchaseIndex: null,
              });
            }
          }
          const contract = Sale.confirm(resolved, input.discount);
          if (input.initialPayment)
            contract.assertPayment(input.initialPayment.amount);
          const initial = input.initialPayment
              ? Money.from(input.initialPayment.amount).cents
              : 0,
            balance = contract.totalCents - initial;
          const receivables = ReceivableSchedule.forBalance(
            balance,
            input.receivables,
            dateKey(now),
          ).snapshot();
          if (input.initialPayment)
            new Payment(
              input.initialPayment.amount,
              input.initialPayment.method,
              input.initialPayment.installments ?? null,
            );
          const sale = await tx.sale.create({
            data: {
              customerId: input.customerId,
              professionalId: normalized.professionalId,
              commissionPercent: input.commissionPercent ?? null,
              discount: contract.globalDiscountCents / 100,
              commercialModel: "V1",
              actorId: actor.id,
              requestKey: input.requestKey,
              requestHash: hash,
              confirmedAt: now,
              allowUnpaidUse: normalized.allowUnpaidUse,
            },
          });
          const savedPurchases: number[] = [];
          for (const purchase of purchases) {
            const p = await tx.saleOfferPurchase.create({
              data: { saleId: sale.id, ...purchase },
            });
            savedPurchases.push(p.id);
          }
          for (const i of contract.items) {
            const item = await tx.saleItem.create({
              data: {
                saleId: sale.id,
                procedureId: i.procedureId,
                variationId: i.variationId,
                variationName: i.variationName,
                offerPurchaseId:
                  i.purchaseIndex === null
                    ? null
                    : savedPurchases[i.purchaseIndex],
                description: i.description,
                sessions: i.sessions,
                unitPrice: i.unitPrice,
                finalPrice: i.finalCents / 100,
                referenceAmount: i.referenceCents / 100,
                promotionalDiscount: i.promotionalCents / 100,
                negotiatedDiscount:
                  (i.lineDiscountCents + i.globalDiscountCents) / 100,
                netAmount: i.netCents / 100,
              },
            });
            await tx.sessionEntitlement.create({
              data: {
                saleId: sale.id,
                saleItemId: item.id,
                customerId: input.customerId,
                procedureId: i.procedureId,
                variationId: i.variationId,
                description: i.description,
                quantity: i.sessions,
                expiresAt: i.expiresAt,
              },
            });
            if (i.promotionalCents)
              await tx.saleDiscount.create({
                data: {
                  saleId: sale.id,
                  itemId: item.id,
                  kind: "PROMOTIONAL",
                  scope: "ITEM",
                  type: "FIXED",
                  value: i.promotionalCents / 100,
                  baseAmount: i.referenceCents / 100,
                  amount: i.promotionalCents / 100,
                  reason: "Condição da oferta contratada",
                  actorId: actor.id,
                },
              });
            if (i.lineDiscountCents && i.discount)
              await tx.saleDiscount.create({
                data: {
                  saleId: sale.id,
                  itemId: item.id,
                  kind: "NEGOTIATED",
                  scope: "ITEM",
                  type: i.discount.type,
                  value: i.discount.value,
                  baseAmount: i.offeredCents / 100,
                  amount: i.lineDiscountCents / 100,
                  reason: i.discount.reason.trim(),
                  actorId: actor.id,
                },
              });
          }
          if (contract.globalDiscountCents && input.discount)
            await tx.saleDiscount.create({
              data: {
                saleId: sale.id,
                kind: "NEGOTIATED",
                scope: "SALE",
                type: input.discount.type,
                value: input.discount.value,
                baseAmount:
                  (contract.totalCents + contract.globalDiscountCents) / 100,
                amount: contract.globalDiscountCents / 100,
                reason: input.discount.reason.trim(),
                actorId: actor.id,
              },
            });
          if (input.initialPayment)
            await tx.salePayment.create({
              data: {
                saleId: sale.id,
                amount: input.initialPayment.amount,
                method: input.initialPayment.method,
                installments: input.initialPayment.installments ?? null,
                actorId: actor.id,
                requestKey: input.requestKey + ":initial",
              },
            });
          for (let n = 0; n < receivables.length; n++)
            await tx.receivableInstallment.create({
              data: {
                saleId: sale.id,
                number: n + 1,
                amount: receivables[n].amount,
                dueOn: new Date(receivables[n].dueOn + "T12:00Z"),
              },
            });
          await tx.commercialEvent.create({
            data: {
              saleId: sale.id,
              type: "SALE_CONFIRMED",
              actorId: actor.id,
              details: {
                total: contract.totalCents / 100,
                allowUnpaidUse: normalized.allowUnpaidUse,
              },
            },
          });
          return sale.id;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 20000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const replay = await this.db.sale.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (replay?.actorId === actor.id && replay.requestHash === hash)
          return this.detail(replay.id, actor);
      }
      throw error;
    }
    return this.detail(id, actor);
  }
  async pay(
    id: number,
    input: {
      amount: number;
      method: "PIX" | "CASH" | "CARD";
      installments?: number | null;
      requestKey: string;
    },
    actor: Actor,
  ) {
    new Payment(input.amount, input.method, input.installments ?? null);
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Sale WHERE id=${id} FOR UPDATE`;
        const s = required(
          await tx.sale.findUnique({
            where: { id },
            include: {
              items: true,
              payments: { include: { reversal: true } },
              receivables: {
                include: {
                  allocations: {
                    include: { payment: { include: { reversal: true } } },
                  },
                },
                orderBy: [{ dueOn: "asc" }, { number: "asc" }],
              },
            },
          }),
        );
        this.authorize(s, actor);
        const previous = await tx.salePayment.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (previous) {
          if (
            previous.saleId !== id ||
            Number(previous.amount) !== input.amount ||
            previous.method !== input.method ||
            previous.installments !== (input.installments ?? null) ||
            previous.actorId !== actor.id
          )
            throw new ApplicationError(
              "Chave já utilizada com outro conteúdo",
              "CONFLICT",
            );
          return;
        }
        if (s.cancelled)
          throw new ApplicationError("Venda cancelada", "CONFLICT");
        const total =
            s.items.reduce(
              (n, i) => n + Money.from(String(i.finalPrice)).cents,
              0,
            ) - Money.from(String(s.discount)).cents,
          received = s.payments
            .filter((p) => !p.reversal)
            .reduce((n, p) => n + Money.from(String(p.amount)).cents, 0);
        Sale.assertPayment(total, received, input.amount);
        const payment = await tx.salePayment.create({
          data: {
            saleId: id,
            amount: input.amount,
            method: input.method,
            installments: input.installments ?? null,
            actorId: actor.id,
            requestKey: input.requestKey,
          },
        });
        let remaining = Money.from(input.amount).cents;
        for (const r of s.receivables) {
          const paid = r.allocations
              .filter((a) => !a.payment.reversal)
              .reduce((n, a) => n + Money.from(String(a.amount)).cents, 0),
            amount = Math.min(
              remaining,
              Money.from(String(r.amount)).cents - paid,
            );
          if (amount > 0) {
            await tx.paymentAllocation.create({
              data: {
                paymentId: payment.id,
                receivableId: r.id,
                amount: amount / 100,
              },
            });
            remaining -= amount;
          }
        }
        await tx.commercialEvent.create({
          data: {
            saleId: id,
            type: "PAYMENT_RECEIVED",
            actorId: actor.id,
            details: { paymentId: payment.id, amount: input.amount },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(id, actor);
  }
  async reversePayment(id: number, reason: string, key: string, actor: Actor) {
    const before = required(
      await this.db.salePayment.findUnique({ where: { id } }),
    );
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Sale WHERE id=${before.saleId} FOR UPDATE`;
        const p = required(
          await tx.salePayment.findUnique({
            where: { id },
            include: { reversal: true, allocations: true },
          }),
        );
        const previous = await tx.paymentReversal.findUnique({
          where: { requestKey: key },
        });
        if (previous) {
          if (
            previous.paymentId !== id ||
            previous.reason !== reason ||
            previous.actorId !== actor.id
          )
            throw new ApplicationError("Chave já utilizada", "CONFLICT");
          return;
        }
        if (p.reversal)
          throw new ApplicationError("Pagamento já estornado", "CONFLICT");
        await tx.paymentReversal.create({
          data: { paymentId: id, reason, requestKey: key, actorId: actor.id },
        });
        const uncovered =
          Money.from(String(p.amount)).cents -
          p.allocations.reduce(
            (n, a) => n + Money.from(String(a.amount)).cents,
            0,
          );
        if (uncovered > 0) {
          const last = await tx.receivableInstallment.findFirst({
            where: { saleId: p.saleId },
            orderBy: { number: "desc" },
          });
          await tx.receivableInstallment.create({
            data: {
              saleId: p.saleId,
              number: (last?.number ?? 0) + 1,
              amount: uncovered / 100,
              dueOn: new Date(dateKey(new Date()) + "T12:00Z"),
            },
          });
        }
        await tx.commercialEvent.create({
          data: {
            saleId: p.saleId,
            type: "PAYMENT_REVERSED",
            reason,
            actorId: actor.id,
            details: { paymentId: id, amount: Number(p.amount) },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(before.saleId, actor);
  }
  async cancel(id: number, reason: string, actor: Actor) {
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Sale WHERE id=${id} FOR UPDATE`;
        const s = required(
          await tx.sale.findUnique({
            where: { id },
            include: {
              entitlements: true,
              payments: { include: { reversal: true } },
            },
          }),
        );
        if (s.cancelled) return;
        await this.sessions.lock(
          tx,
          s.entitlements.map((e) => e.id),
        );
        const sum = await tx.sessionRedemption.aggregate({
            where: { entitlement: { saleId: id } },
            _sum: { quantityDelta: true },
          }),
          reserved = await tx.sessionReservation.count({
            where: { entitlement: { saleId: id }, ...activeReservationWhere() },
          });
        Sale.assertCancellation(
          s.payments
            .filter((p) => !p.reversal)
            .reduce((n, p) => n + Money.from(String(p.amount)).cents, 0),
          sum._sum.quantityDelta ?? 0,
          reserved,
        );
        await tx.sale.update({ where: { id }, data: { cancelled: true } });
        await tx.commercialEvent.create({
          data: {
            saleId: id,
            type: "SALE_CANCELLED",
            reason,
            actorId: actor.id,
            details: {},
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(id, actor);
  }
  async legacyCreate(input: any, actor: Actor) {
    return this.create(
      {
        customerId: input.customerId,
        professionalId: input.professionalId,
        commissionPercent: input.commissionPercent,
        allowUnpaidUse: false,
        requestKey: input.requestKey,
        lines: input.items.map((i: any) => ({
          procedureId: i.procedureId,
          variationId: i.procedurePriceVariationId,
          sessions: i.sessions,
          expectedUnitPrice: i.unitPrice,
          agreedTotal: i.finalPrice,
          discountReason: i.discountReason ?? input.discountReason,
        })),
        discount:
          input.discount > 0
            ? {
                type: "FIXED",
                value: input.discount,
                reason: input.discountReason ?? "",
              }
            : undefined,
        initialPayment: input.initialPayment,
      },
      actor,
    );
  }
}
