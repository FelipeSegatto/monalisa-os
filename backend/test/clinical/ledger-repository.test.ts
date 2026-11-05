import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaShotLedger } from "../../src/shot-ledger/infrastructure/prisma-shot-ledger";
import { PrismaInventoryRepository } from "../../src/inventory/infrastructure/prisma-inventory.repository";
function shots() {
  const entries: any[] = [];
  const db: any = {
    $queryRaw: async () => [{ id: 1 }],
    equipment: {
      findUnique: async () => ({
        id: 1,
        status: "ACTIVE",
        shotTracking: "COMPONENT",
      }),
    },
    equipmentComponent: {
      findUnique: async () => ({
        id: 2,
        equipmentId: 1,
        status: "ACTIVE",
        nominalCapacity: 100,
      }),
    },
    shotLedgerEntry: {
      aggregate: async () => ({
        _sum: {
          quantityDelta: entries.reduce((n, e) => n + e.quantityDelta, 0),
        },
      }),
      count: async ({ where }: any) =>
        entries.filter((e) => !where.type || e.type === where.type).length,
      create: async ({ data }: any) => {
        const e = { id: entries.length + 1, ...data };
        entries.push(e);
        return e;
      },
      findUnique: async ({ where }: any) =>
        entries.find((e) =>
          where.requestKey
            ? e.requestKey === where.requestKey
            : where.reversesId
              ? e.reversesId === where.reversesId
              : e.id === where.id,
        ) ?? null,
    },
  };
  db.$transaction = async (fn: any) => fn(db);
  return { db, entries, ledger: new PrismaShotLedger(db) };
}
const opening = {
  equipmentId: 1,
  componentId: 2,
  type: "OPENING" as const,
  quantityDelta: 90,
  actorId: 7,
  reason: "Real opening",
  requestKey: "opening",
};
test("shot consumption needs an explicit opening and respects cartridge capacity", async () => {
  const { db, ledger, entries } = shots();
  const used = {
    ...opening,
    type: "CONSUMPTION" as const,
    executionId: 3,
    quantityDelta: 10,
    requestKey: "use",
  };
  await assert.rejects(() => ledger.append(db, used), /contador inicial/);
  await ledger.post(opening);
  await ledger.append(db, used);
  assert.equal(entries.length, 2);
  await assert.rejects(
    () => ledger.append(db, { ...used, quantityDelta: 1, requestKey: "over" }),
    /Capacidade/,
  );
  assert.equal(entries.length, 2);
});
test("opening at zero is explicit, request retries do not duplicate, changed content conflicts", async () => {
  const { ledger, entries } = shots();
  const input = { ...opening, quantityDelta: 0 };
  await ledger.post(input);
  await ledger.post(input);
  assert.equal(entries.length, 1);
  await assert.rejects(
    () => ledger.post({ ...input, quantityDelta: 1 }),
    /outro conteúdo/,
  );
  await assert.rejects(
    () => ledger.post({ ...input, requestKey: "second-opening" }),
    /inicializado/,
  );
});
test("shot reversals append compensation and retain the original entry", async () => {
  const { ledger, entries } = shots();
  await ledger.post(opening);
  await ledger.post({
    ...opening,
    type: "ADJUSTMENT",
    quantityDelta: 5,
    requestKey: "adjust",
  });
  const result: any = await ledger.reverse(2, "Wrong quantity", "reverse", 7);
  assert.equal(result.quantityDelta, -5);
  assert.equal(result.reversesId, 2);
  assert.equal(entries.length, 3);
  assert.equal(entries[1].quantityDelta, 5);
  await ledger.reverse(2, "Wrong quantity", "reverse", 7);
  assert.equal(entries.length, 3);
  await assert.rejects(
    () => ledger.reverse(2, "Again", "again", 7),
    /estornado/,
  );
  await assert.rejects(
    () => ledger.reverse(1, "Opening", "reverse-opening", 7),
    /estornado/,
  );
});
test("stock post locks the item before reading, blocks overdraft and deduplicates retries", async () => {
  let quantity = 2;
  const entries: any[] = [],
    order: string[] = [];
  const db: any = {
    $queryRaw: async () => {
      order.push("lock");
    },
    stockItem: {
      findUnique: async () => {
        order.push("read");
        return { id: 1, quantity, active: true };
      },
      update: async ({ data }: any) => {
        quantity = data.quantity;
      },
    },
    stockMovement: {
      findUnique: async ({ where }: any) =>
        entries.find((e) => e.requestKey === where.requestKey) ?? null,
      create: async ({ data }: any) => {
        entries.push(data);
        return data;
      },
    },
  };
  db.$transaction = async (fn: any) => fn(db);
  const repo = new PrismaInventoryRepository(db),
    input = {
      type: "CONSUMPTION" as const,
      quantity: 1,
      note: "Pot finished",
      requestKey: "key",
      actorId: 7,
    };
  await repo.post(1, input);
  await repo.post(1, input);
  assert.equal(quantity, 1);
  assert.equal(entries.length, 1);
  assert.deepEqual(order.slice(0, 2), ["lock", "read"]);
  await assert.rejects(
    () => repo.post(1, { ...input, requestKey: "other", quantity: 2 }),
    /insuficiente/,
  );
  assert.equal(quantity, 1);
  assert.equal(entries.length, 1);
});

test("changing cartridge status or using a cartridge from another device is rejected", async () => {
  const f = shots();
  await f.ledger.post(opening);
  const input = {
    ...opening,
    type: "CONSUMPTION" as const,
    executionId: 3,
    quantityDelta: 1,
    requestKey: "use",
  };
  f.db.equipmentComponent.findUnique = async () => ({
    id: 2,
    equipmentId: 1,
    status: "MAINTENANCE",
    nominalCapacity: 100,
  });
  await assert.rejects(() => f.ledger.append(f.db, input), /indisponível/);
  f.db.equipmentComponent.findUnique = async () => ({
    id: 2,
    equipmentId: 9,
    status: "ACTIVE",
    nominalCapacity: 100,
  });
  await assert.rejects(() => f.ledger.append(f.db, input), /pertence/);
  assert.equal(f.entries.length, 1);
});

test("correcting consumption posts a reversal and a linked replacement so procedure metrics retain the corrected total", async () => {
  const f = shots();
  await f.ledger.post(opening);
  await f.ledger.append(f.db, {
    ...opening,
    type: "CONSUMPTION",
    executionId: 3,
    quantityDelta: 5,
    requestKey: "use",
  });
  const result: any = await f.ledger.correct(
    2,
    8,
    "Count corrected",
    "correct",
    7,
  );
  assert.equal(result.quantityDelta, 8);
  assert.equal(result.replacesId, 2);
  assert.equal(result.executionId, 3);
  assert.equal(f.entries.length, 4);
  assert.equal(
    f.entries
      .filter((e) => e.executionId === 3)
      .reduce((n, e) => n + e.quantityDelta, 0),
    8,
  );
  await f.ledger.correct(2, 8, "Count corrected", "correct", 7);
  assert.equal(f.entries.length, 4);
  await assert.rejects(
    () => f.ledger.correct(2, 9, "Another correction", "other", 7),
    /não estornado/,
  );
});

test("cancelling an in-progress attendance preserves the record and cancels its reservation", async () => {
  const { PrismaAttendanceRepository } =
    await import("../../src/attendances/infrastructure/prisma-attendance.repository");
  const a: any = {
    id: 1,
    appointmentId: 2,
    professionalId: 1,
    status: "IN_PROGRESS",
    startedAt: new Date(Date.now() - 1000),
  };
  let appointmentStatus = "CONFIRMED";
  const db: any = {
    $queryRaw: async () => [{ id: 1 }],
    attendance: {
      findUnique: async () => a,
      update: async ({ data }: any) => Object.assign(a, data),
    },
    appointment: {
      update: async ({ data }: any) => {
        appointmentStatus = data.status;
      },
    },
  };
  db.$transaction = async (fn: any) => fn(db);
  const repo = new PrismaAttendanceRepository(db, {} as any,{release:async()=>undefined} as any),
    actor = {
      id: 7,
      name: "Admin",
      role: "ADMIN" as const,
      professionalId: null,
    };
  await repo.cancel(1, "Started by mistake", actor);
  assert.equal(a.status, "CANCELLED");
  assert.equal(a.cancelledById, 7);
  assert.equal(a.cancellationReason, "Started by mistake");
  assert.equal(appointmentStatus, "CANCELLED");
  await repo.cancel(1, "Started by mistake", actor);
  await assert.rejects(
    () => repo.cancel(1, "Another reason", actor),
    /em andamento/,
  );
});
