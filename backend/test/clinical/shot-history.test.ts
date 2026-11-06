import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaShotLedger } from "../../src/shot-ledger/infrastructure/prisma-shot-ledger";

test("histórico pagina por ID e carrega autoria, execução e estorno sem expor credenciais", async () => {
  const row = {
    id: 98,
    actor: { id: 7, name: "Profissional" },
    reversal: { id: 101 },
  };
  let query: any;
  const repository = new PrismaShotLedger({
    shotLedgerEntry: {
      findMany: async (input: any) => {
        query = input;
        return [row];
      },
    },
  } as any);
  assert.deepEqual(await repository.entries(3, 100), [row]);
  assert.deepEqual(query.where, { equipmentId: 3, id: { lt: 100 } });
  assert.deepEqual(query.include.actor, { select: { id: true, name: true } });
  assert.deepEqual(query.include.reversal, { select: { id: true } });
  assert.ok(query.include.execution.select.procedureName);
  assert.equal(query.take, 100);
});
