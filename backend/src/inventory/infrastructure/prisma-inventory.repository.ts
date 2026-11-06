import { Prisma } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { required } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import {
  InventoryRepository,
  StockPosting,
} from "../application/inventory.repository";
import { StockBalance } from "../domain/stock-balance";
@Injectable()
export class PrismaInventoryRepository extends InventoryRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async post(id: number, input: StockPosting) {
    if (input.expiresAt && input.type !== "IN")
      throw new ApplicationError(
        "Validade só pode ser informada em entradas",
        "INVALID_INPUT",
      );
    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt + "T12:00:00Z")
      : null;
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM StockItem WHERE id=${id} FOR UPDATE`;
        const item = required(await tx.stockItem.findUnique({ where: { id } }));
        const delta =
          input.type === "CONSUMPTION" ? -input.quantity : input.quantity;
        const previous = await tx.stockMovement.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (previous) {
          if (
            previous.stockItemId !== id ||
            previous.type !== input.type ||
            Number(previous.quantityDelta) !== delta ||
            previous.actorId !== input.actorId ||
            previous.note !== input.note ||
            (previous.expiresAt?.toISOString().slice(0, 10) ?? null) !==
              (input.expiresAt ?? null)
          )
            throw new ApplicationError(
              "Chave já utilizada com outro conteúdo",
              "CONFLICT",
            );
          return previous;
        }
        if (!item.active)
          throw new ApplicationError("Material inativo", "CONFLICT");
        const movement = new StockBalance(Number(item.quantity)).move(
          input.type,
          input.quantity,
        );
        await tx.stockItem.update({
          where: { id },
          data: { quantity: movement.balance },
        });
        return tx.stockMovement.create({
          data: {
            stockItemId: id,
            type: input.type,
            quantityDelta: movement.delta,
            note: input.note,
            requestKey: input.requestKey,
            actorId: input.actorId,
            expiresAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
  async reverse(id: number, note: string, requestKey: string, actorId: number) {
    const original = required(
      await this.db.stockMovement.findUnique({ where: { id } }),
    );
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM StockItem WHERE id=${original.stockItemId} FOR UPDATE`;
        const previous = await tx.stockMovement.findUnique({
          where: { requestKey },
        });
        if (previous) {
          if (
            previous.reversesId !== id ||
            previous.note !== note ||
            previous.actorId !== actorId
          )
            throw new ApplicationError("Chave já utilizada", "CONFLICT");
          return previous;
        }
        if (
          original.reversesId ||
          (await tx.stockMovement.findUnique({ where: { reversesId: id } }))
        )
          throw new ApplicationError(
            "Movimento já estornado ou é um estorno",
            "CONFLICT",
          );
        const item = required(
          await tx.stockItem.findUnique({
            where: { id: original.stockItemId },
          }),
        );
        const move = new StockBalance(Number(item.quantity)).move(
          "ADJUSTMENT",
          -Number(original.quantityDelta),
        );
        await tx.stockItem.update({
          where: { id: item.id },
          data: { quantity: move.balance },
        });
        return tx.stockMovement.create({
          data: {
            stockItemId: item.id,
            type: "ADJUSTMENT",
            quantityDelta: move.delta,
            note,
            requestKey,
            actorId,
            reversesId: id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
