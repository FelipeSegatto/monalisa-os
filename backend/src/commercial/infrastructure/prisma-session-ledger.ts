import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { required } from "../../common/util";
import { Actor } from "../../auth/domain/actor";
import { ApplicationError } from "../../shared/domain/application-error";
import { SessionEntitlement } from "../domain/session-entitlement";
import { Money } from "../domain/money";
export const activeReservationWhere = (
  excludeId?: number,
): Prisma.SessionReservationWhereInput => ({
  status: "ACTIVE",
  ...(excludeId ? { appointmentId: { not: excludeId } } : {}),
  appointment: {
    status: { in: ["SCHEDULED", "CONFIRMED"] },
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
      { status: { not: "SCHEDULED" } },
    ],
  },
});
@Injectable()
export class PrismaSessionLedger {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async load(
    tx: Prisma.TransactionClient,
    id: number,
    excludeAppointmentId?: number,
  ) {
    const e = required(
      await tx.sessionEntitlement.findUnique({
        where: { id },
        include: {
          sale: {
            include: { items: true, payments: { include: { reversal: true } } },
          },
        },
      }),
    );
    const [sum, reserved] = await Promise.all([
      tx.sessionRedemption.aggregate({
        where: { entitlementId: id },
        _sum: { quantityDelta: true },
      }),
      tx.sessionReservation.count({
        where: {
          entitlementId: id,
          ...activeReservationWhere(excludeAppointmentId),
        },
      }),
    ]);
    const total =
      e.sale.items.reduce(
        (n, i) => n + Money.from(String(i.finalPrice)).cents,
        0,
      ) - Money.from(String(e.sale.discount)).cents;
    const received = e.sale.payments
      .filter((p) => !p.reversal)
      .reduce((n, p) => n + Money.from(String(p.amount)).cents, 0);
    return {
      e,
      used: sum._sum.quantityDelta ?? 0,
      reserved,
      paymentAllowed: e.sale.allowUnpaidUse === true || received >= total,
    };
  }
  async lock(tx: Prisma.TransactionClient, ids: number[]) {
    const rows = await tx.sessionEntitlement.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { saleId: true },
    });
    for (const id of [...new Set(rows.map((e) => e.saleId))].sort(
      (a, b) => a - b,
    ))
      await tx.$queryRaw`SELECT id FROM Sale WHERE id=${id} FOR UPDATE`;
    for (const id of [...new Set(ids)].sort((a, b) => a - b))
      await tx.$queryRaw`SELECT id FROM SessionEntitlement WHERE id=${id} FOR UPDATE`;
  }
  private assert(
    data: Awaited<ReturnType<PrismaSessionLedger["load"]>>,
    input: {
      customerId: number;
      procedureId: number;
      variationId: number | null;
      at: Date;
    },
  ) {
    const { e } = data;
    new SessionEntitlement(
      e.quantity,
      data.used,
      data.reserved,
      e.expiresAt,
    ).assertAvailable({
      ...input,
      ownerId: e.customerId,
      expectedProcedureId: e.procedureId,
      expectedVariationId: e.variationId,
      cancelled: e.sale.cancelled,
      paymentAllowed: data.paymentAllowed,
    });
  }
  async reserve(
    tx: Prisma.TransactionClient,
    entitlementId: number,
    appointmentId: number,
    input: {
      customerId: number;
      procedureId: number;
      variationId: number | null;
      at: Date;
    },
    actorId: number,
  ) {
    const old = await tx.sessionReservation.findUnique({
      where: { appointmentId },
    });
    if (old?.status === "REDEEMED")
      throw new ApplicationError("Sessão já realizada", "CONFLICT");
    await this.lock(tx, [entitlementId, ...(old ? [old.entitlementId] : [])]);
    const data = await this.load(tx, entitlementId, appointmentId);
    this.assert(data, input);
    const row = await tx.sessionReservation.upsert({
      where: { appointmentId },
      create: { entitlementId, appointmentId },
      update: { entitlementId, status: "ACTIVE" },
    });
    await tx.commercialEvent.create({
      data: {
        saleId: data.e.saleId,
        type: "SESSION_RESERVED",
        actorId,
        details: {
          appointmentId,
          entitlementId,
          previousEntitlementId: old?.entitlementId ?? null,
        },
      },
    });
    return row;
  }
  async release(
    tx: Prisma.TransactionClient,
    appointmentId: number,
    actorId: number,
    reason: string,
  ) {
    const r = await tx.sessionReservation.findUnique({
      where: { appointmentId },
    });
    if (!r || r.status !== "ACTIVE") return;
    await this.lock(tx, [r.entitlementId]);
    await tx.sessionReservation.update({
      where: { id: r.id },
      data: { status: "RELEASED" },
    });
    const e = required(
      await tx.sessionEntitlement.findUnique({
        where: { id: r.entitlementId },
      }),
    );
    await tx.commercialEvent.create({
      data: {
        saleId: e.saleId,
        type: "SESSION_RELEASED",
        actorId,
        reason,
        details: { appointmentId, entitlementId: e.id },
      },
    });
  }
  async redeem(
    tx: Prisma.TransactionClient,
    id: number,
    executionId: number,
    input: {
      customerId: number;
      procedureId: number;
      variationId: number | null;
      at: Date;
      appointmentId: number | null;
    },
    actorId: number,
    requestKey: string,
  ) {
    await this.lock(tx, [id]);
    const data = await this.load(tx, id, input.appointmentId ?? undefined);
    this.assert(data, input);
    const hold = input.appointmentId
      ? await tx.sessionReservation.findUnique({
          where: { appointmentId: input.appointmentId },
          include: { entitlement: true },
        })
      : null;
    if (
      hold?.status === "ACTIVE" &&
      hold.entitlementId !== id &&
      hold.entitlement.procedureId === input.procedureId &&
      hold.entitlement.variationId === input.variationId
    )
      throw new ApplicationError(
        "Libere a sessão reservada antes de utilizar outro pacote",
        "CONFLICT",
      );
    const entry = await tx.sessionRedemption.create({
      data: {
        entitlementId: id,
        executionId,
        quantityDelta: 1,
        actorId,
        requestKey,
      },
    });
    if (hold?.status === "ACTIVE" && hold.entitlementId === id)
      await tx.sessionReservation.update({
        where: { id: hold.id },
        data: { status: "REDEEMED" },
      });
    return entry;
  }
  async list(customerId: number) {
    const ids = await this.db.sessionEntitlement.findMany({
      where: { customerId },
      select: { id: true },
      orderBy: { id: "desc" },
    });
    const result = [];
    for (const { id } of ids) {
      const d = await this.load(this.db, id),
        e = d.e,
        expired = Boolean(e.expiresAt && e.expiresAt <= new Date());
      result.push({
        id: e.id,
        saleId: e.saleId,
        saleItemId: e.saleItemId,
        procedureId: e.procedureId,
        variationId: e.variationId,
        description: e.description,
        quantity: e.quantity,
        used: d.used,
        reserved: d.reserved,
        available:
          e.sale.cancelled || expired || !d.paymentAllowed
            ? 0
            : Math.max(0, e.quantity - d.used - d.reserved),
        expiresAt: e.expiresAt,
        status: e.sale.cancelled
          ? "CANCELLED"
          : expired
            ? "EXPIRED"
            : !d.paymentAllowed
              ? "AWAITING_PAYMENT"
              : "ACTIVE",
      });
    }
    return { entitlements: result };
  }
  async attach(
    appointmentId: number,
    entitlementId: number | null,
    variationId: number | null,
    actor: Actor,
  ) {
    const before = required(
      await this.db.appointment.findUnique({ where: { id: appointmentId } }),
    );
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Professional WHERE id=${before.professionalId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM \`Procedure\` WHERE id=${before.procedureId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM Appointment WHERE id=${appointmentId} FOR UPDATE`;
        const a = required(
          await tx.appointment.findUnique({ where: { id: appointmentId } }),
        );
        if (actor.role !== "ADMIN" && actor.professionalId !== a.professionalId)
          throw new ApplicationError(
            "Agendamento pertence a outro profissional",
            "FORBIDDEN",
          );
        if (
          a.professionalId !== before.professionalId ||
          !["SCHEDULED", "CONFIRMED"].includes(a.status) ||
          (a.expiresAt && a.expiresAt <= new Date())
        )
          throw new ApplicationError(
            "Reserva alterada ou encerrada",
            "CONFLICT",
          );
        if (entitlementId)
          return this.reserve(
            tx,
            entitlementId,
            a.id,
            {
              customerId: a.customerId,
              procedureId: a.procedureId,
              variationId,
              at: new Date(Math.max(Date.now(), +a.startsAt)),
            },
            actor.id,
          );
        await this.release(
          tx,
          a.id,
          actor.id,
          "Vínculo liberado pelo profissional",
        );
        return { released: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  async reverse(id: number, reason: string, key: string, actor: Actor) {
    const original = required(
      await this.db.sessionRedemption.findUnique({ where: { id } }),
    );
    return this.db.$transaction(
      async (tx) => {
        await this.lock(tx, [original.entitlementId]);
        const previous = await tx.sessionRedemption.findUnique({
          where: { requestKey: key },
        });
        if (previous) {
          if (
            previous.reversesId !== id ||
            previous.reason !== reason ||
            previous.actorId !== actor.id
          )
            throw new ApplicationError("Chave já utilizada", "CONFLICT");
          return previous;
        }
        if (
          original.quantityDelta !== 1 ||
          (await tx.sessionRedemption.findUnique({ where: { reversesId: id } }))
        )
          throw new ApplicationError(
            "Utilização já estornada ou é um estorno",
            "CONFLICT",
          );
        const entry = await tx.sessionRedemption.create({
          data: {
            entitlementId: original.entitlementId,
            quantityDelta: -1,
            reversesId: id,
            actorId: actor.id,
            reason,
            requestKey: key,
          },
        });
        const e = required(
          await tx.sessionEntitlement.findUnique({
            where: { id: original.entitlementId },
          }),
        );
        await tx.commercialEvent.create({
          data: {
            saleId: e.saleId,
            type: "SESSION_REVERSED",
            actorId: actor.id,
            reason,
            details: { redemptionId: id, reversalId: entry.id },
          },
        });
        return entry;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
