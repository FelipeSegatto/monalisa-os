import {
  ShotPosting,
  ShotLedgerRepository,
} from "../application/shot-ledger.repository";
import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { required } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import { ShotCounter } from "../domain/shot-counter";
@Injectable()
export class PrismaShotLedger extends ShotLedgerRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async append(tx: Prisma.TransactionClient, input: ShotPosting) {
    await tx.$queryRaw`SELECT id FROM Equipment WHERE id=${input.equipmentId} FOR UPDATE`;
    const eq = required(
      await tx.equipment.findUnique({ where: { id: input.equipmentId } }),
    );
    const component = input.componentId
      ? required(
          await tx.equipmentComponent.findUnique({
            where: { id: input.componentId },
          }),
        )
      : null;
    if (component && component.equipmentId !== eq.id)
      throw new ApplicationError(
        "Cartucho não pertence ao equipamento",
        "CONFLICT",
      );
    if (
      input.type === "CONSUMPTION" &&
      !input.replacesId &&
      (eq.status !== "ACTIVE" || (component && component.status !== "ACTIVE"))
    )
      throw new ApplicationError(
        "Equipamento ou componente indisponível",
        "CONFLICT",
      );
    if (
      input.type !== "REVERSAL" &&
      (eq.shotTracking === "NONE" ||
        (eq.shotTracking === "COMPONENT") !== Boolean(component))
    )
      throw new ApplicationError(
        "Informe o contador correto do equipamento",
        "INVALID_INPUT",
      );
    if (input.type === "CONSUMPTION" && input.quantityDelta <= 0)
      throw new ApplicationError("Consumo deve ser positivo", "INVALID_INPUT");
    if (input.type !== "CONSUMPTION" && !input.reason?.trim())
      throw new ApplicationError(
        "Informe o motivo da movimentação",
        "INVALID_INPUT",
      );
    const sum = await tx.shotLedgerEntry.aggregate({
      where: { equipmentId: eq.id, componentId: input.componentId },
      _sum: { quantityDelta: true },
    });
    const counter = new ShotCounter(
      sum._sum.quantityDelta ?? 0,
      component?.nominalCapacity ?? null,
    );
    if (input.quantityDelta !== 0) counter.apply(input.quantityDelta);
    else if (input.type !== "OPENING")
      throw new ApplicationError(
        "Movimento não pode ser zero",
        "INVALID_INPUT",
      );
    if (
      input.type !== "OPENING" &&
      input.type !== "REVERSAL" &&
      !(await tx.shotLedgerEntry.count({
        where: {
          equipmentId: eq.id,
          componentId: input.componentId,
          type: "OPENING",
        },
      }))
    )
      throw new ApplicationError(
        "Registre o contador inicial antes do consumo",
        "CONFLICT",
      );
    if (input.type === "OPENING" && input.quantityDelta < 0)
      throw new ApplicationError(
        "Contador inicial não pode ser negativo",
        "INVALID_INPUT",
      );
    if (
      input.type === "OPENING" &&
      (await tx.shotLedgerEntry.count({
        where: { equipmentId: eq.id, componentId: input.componentId },
      }))
    )
      throw new ApplicationError("Contador já inicializado", "CONFLICT");
    return tx.shotLedgerEntry.create({ data: input });
  }
  async post(input: ShotPosting) {
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Equipment WHERE id=${input.equipmentId} FOR UPDATE`;
        const previous = await tx.shotLedgerEntry.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (previous) {
          if (
            previous.equipmentId !== input.equipmentId ||
            previous.componentId !== input.componentId ||
            previous.quantityDelta !== input.quantityDelta ||
            previous.type !== input.type ||
            previous.reason !== (input.reason ?? null) ||
            previous.actorId !== input.actorId
          )
            throw new ApplicationError(
              "Chave já utilizada com outro conteúdo",
              "CONFLICT",
            );
          return previous;
        }
        return this.append(tx, input);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  async correct(
    id: number,
    quantity: number,
    reason: string,
    requestKey: string,
    actorId: number,
  ) {
    const original = required(
      await this.db.shotLedgerEntry.findUnique({ where: { id } }),
    );
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Equipment WHERE id=${original.equipmentId} FOR UPDATE`;
        const previous = await tx.shotLedgerEntry.findUnique({
          where: { requestKey },
        });
        if (previous) {
          if (
            previous.replacesId !== id ||
            previous.quantityDelta !== quantity ||
            previous.reason !== reason ||
            previous.actorId !== actorId
          )
            throw new ApplicationError(
              "Chave já utilizada com outro conteúdo",
              "CONFLICT",
            );
          return previous;
        }
        if (
          original.type !== "CONSUMPTION" ||
          !original.executionId ||
          (await tx.shotLedgerEntry.findUnique({ where: { reversesId: id } }))
        )
          throw new ApplicationError(
            "Somente consumo não estornado pode ser corrigido",
            "CONFLICT",
          );
        if (quantity === original.quantityDelta)
          throw new ApplicationError(
            "A quantidade informada já está registrada",
            "INVALID_INPUT",
          );
        await this.append(tx, {
          equipmentId: original.equipmentId,
          componentId: original.componentId,
          executionId: original.executionId,
          type: "REVERSAL",
          quantityDelta: -original.quantityDelta,
          actorId,
          reason,
          requestKey: requestKey + ":reversal",
          reversesId: id,
        });
        return this.append(tx, {
          equipmentId: original.equipmentId,
          componentId: original.componentId,
          executionId: original.executionId,
          type: "CONSUMPTION",
          quantityDelta: quantity,
          actorId,
          reason,
          requestKey,
          replacesId: id,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  async reverse(
    id: number,
    reason: string,
    requestKey: string,
    actorId: number,
  ) {
    const entry = required(
      await this.db.shotLedgerEntry.findUnique({ where: { id } }),
    );
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Equipment WHERE id=${entry.equipmentId} FOR UPDATE`;
        const previous = await tx.shotLedgerEntry.findUnique({
          where: { requestKey },
        });
        if (previous) {
          if (
            previous.reversesId !== id ||
            previous.reason !== reason ||
            previous.actorId !== actorId
          )
            throw new ApplicationError("Chave já utilizada", "CONFLICT");
          return previous;
        }
        if (
          entry.type === "OPENING" ||
          entry.type === "REVERSAL" ||
          (await tx.shotLedgerEntry.findUnique({ where: { reversesId: id } }))
        )
          throw new ApplicationError(
            "Lançamento já estornado ou é um estorno",
            "CONFLICT",
          );
        return this.append(tx, {
          equipmentId: entry.equipmentId,
          componentId: entry.componentId,
          executionId: entry.executionId ?? undefined,
          quantityDelta: -entry.quantityDelta,
          type: "REVERSAL",
          actorId,
          reason,
          requestKey,
          reversesId: id,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  async counters(equipmentId: number) {
    const eq = required(
      await this.db.equipment.findUnique({
        where: { id: equipmentId },
        include: { components: true },
      }),
    );
    const totals = await this.db.shotLedgerEntry.groupBy({
      by: ["componentId"],
      where: { equipmentId },
      _sum: { quantityDelta: true },
      _count: { id: true },
    });
    const initialized = (id: number | null) =>
      totals.some((t) => t.componentId === id);
    const consumed = (id: number | null) =>
      totals.find((t) => t.componentId === id)?._sum.quantityDelta ?? 0;
    return {
      equipmentId,
      tracking: eq.shotTracking,
      consumed: totals.reduce((n, t) => n + (t._sum.quantityDelta ?? 0), 0),
      initialized: initialized(null),
      equipmentCounter: initialized(null) ? consumed(null) : null,
      components: eq.components.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        capacity: c.nominalCapacity,
        initialized: initialized(c.id),
        consumed: initialized(c.id) ? consumed(c.id) : null,
        remaining:
          !initialized(c.id) || c.nominalCapacity === null
            ? null
            : c.nominalCapacity - consumed(c.id),
      })),
    };
  }
  entries(equipmentId: number, cursor?: number) {
    return this.db.shotLedgerEntry.findMany({
      where: { equipmentId, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: "desc" },
      take: 100,
      include: {
        actor: { select: { id: true, name: true } },
        component: { select: { id: true, name: true } },
        execution: {
          select: {
            id: true,
            attendanceId: true,
            procedureName: true,
            variationName: true,
            professional: { select: { id: true, name: true } },
          },
        },
        reversal: { select: { id: true } },
        replacement: { select: { id: true } },
      },
    });
  }
}
