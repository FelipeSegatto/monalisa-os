import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nearestExpiry,
  stockExpiryDate,
} from "../../src/inventory/domain/stock-expiry";
import { PrismaInventoryRepository } from "../../src/inventory/infrastructure/prisma-inventory.repository";

test("validade é um dia civil real, sem normalizar datas impossíveis", () => {
  assert.equal(
    stockExpiryDate("2028-02-29").toISOString(),
    "2028-02-29T00:00:00.000Z",
  );
  for (const day of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-11-00",
    "2026-1-01",
    "2026-11-01T00:00:00Z",
    "invalid",
  ])
    assert.throws(() => stockExpiryDate(day), /Data de validade inválida/);
});

test("alerta seleciona entrada não estornada, respeita 30 dias e não presume datas desconhecidas", () => {
  const receipt = (date: string | null, reversal: unknown = null) => ({
    type: "IN",
    expiresAt: date ? stockExpiryDate(date) : null,
    reversal,
  });
  assert.equal(nearestExpiry(undefined, "2026-11-06"), null);
  assert.equal(nearestExpiry([receipt(null)], "2026-11-06"), null);
  assert.equal(
    nearestExpiry(
      [receipt("2026-11-01", { id: 2 }), receipt("2026-12-07")],
      "2026-11-06",
    ),
    null,
  );
  assert.deepEqual(
    nearestExpiry([receipt("2026-12-06"), receipt("2026-11-05")], "2026-11-06"),
    { date: "2026-11-05", status: "EXPIRED" },
  );
  assert.deepEqual(nearestExpiry([receipt("2026-12-06")], "2026-11-06"), {
    date: "2026-12-06",
    status: "NEAR",
  });
  assert.deepEqual(nearestExpiry([receipt("2026-11-06")], "2026-11-06"), {
    date: "2026-11-06",
    status: "NEAR",
  });
  assert.equal(
    nearestExpiry(
      [{ ...receipt("2026-11-01"), type: "CONSUMPTION" }],
      "2026-11-06",
    ),
    null,
  );
});

test("validade inválida ou em saída é recusada antes de alterar o estoque", async () => {
  let transactions = 0;
  const repository = new PrismaInventoryRepository({
    $transaction: async () => {
      transactions++;
    },
  } as any);
  const input = {
    type: "IN" as const,
    quantity: 1,
    note: "Synthetic entry",
    actorId: 7,
    requestKey: "synthetic-key",
    expiresAt: "2026-02-30",
  };
  await assert.rejects(repository.post(1, input), /Data de validade inválida/);
  await assert.rejects(
    repository.post(1, {
      ...input,
      type: "CONSUMPTION",
      expiresAt: "2026-11-06",
    }),
    /só pode ser informada em entradas/,
  );
  assert.equal(transactions, 0);
});

test("idempotência de entrada também protege sua validade", async () => {
  const original = {
    stockItemId: 1,
    type: "IN",
    quantityDelta: 1,
    actorId: 7,
    note: "Synthetic entry",
    expiresAt: stockExpiryDate("2026-12-01"),
  };
  let writes = 0;
  const tx = {
    $queryRaw: async () => [],
    stockItem: {
      findUnique: async () => ({ id: 1, active: true, quantity: 1 }),
      update: async () => {
        writes++;
      },
    },
    stockMovement: { findUnique: async () => original },
  };
  const repository = new PrismaInventoryRepository({
    $transaction: async (work: any) => work(tx),
  } as any);
  const input = {
    type: "IN" as const,
    quantity: 1,
    note: "Synthetic entry",
    actorId: 7,
    requestKey: "synthetic-key",
    expiresAt: "2026-12-01",
  };
  assert.equal(await repository.post(1, input), original);
  await assert.rejects(
    repository.post(1, { ...input, expiresAt: "2026-12-02" }),
    /outro conteúdo/,
  );
  assert.equal(writes, 0);
});
