import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaProcedureRepository } from "../../src/procedures/infrastructure/prisma-procedure.repository";
import { EquipmentCompatibilityAdapter } from "../../src/procedures/infrastructure/equipment-compatibility.adapter";
function fixture() {
  let row: any = {
    id: 1,
    categoryId: 1,
    name: "Tratamento",
    description: null,
    durationMinutes: 30,
    price: 100,
    active: false,
    technology: "GENERAL",
    requiresEquipment: false,
    equipmentReviewedAt: null,
    materialsReviewedAt: null,
    variations: [
      {
        id: 10,
        procedureId: 1,
        groupName: "Corpo",
        name: "Axilas",
        reference: null,
        price: 90,
        active: true,
        sortOrder: 0,
        kind: "AREA",
      },
      {
        id: 11,
        procedureId: 1,
        groupName: "Corpo",
        name: "Virilha",
        reference: null,
        price: 100,
        active: true,
        sortOrder: 1,
        kind: "AREA",
      },
    ],
    materials: [],
  };
  const calls: string[] = [];
  let fail = false;
  const tx: any = {
    $queryRaw: async () => {
      calls.push("lock");
      return [{ id: 1 }];
    },
    procedure: {
      findUniqueOrThrow: async () => structuredClone(row),
      update: async ({ data }: any) => {
        calls.push("procedure");
        Object.assign(row, data);
        return row;
      },
    },
    procedureVariation: {
      create: async ({ data }: any) => {
        calls.push("option-create");
        row.variations.push({ ...data, id: 12 });
      },
      updateMany: async ({ where, data }: any) => {
        calls.push("option-update");
        if (fail) throw new Error("Falha de persistência");
        const found = row.variations.find(
          (v: any) => v.id === where.id && v.procedureId === where.procedureId,
        );
        if (!found) return { count: 0 };
        Object.assign(found, data);
        return { count: 1 };
      },
    },
    stockItem: { findUnique: async () => ({ id: 1 }) },
    procedureMaterial: {
      deleteMany: async () => {
        row.materials = [];
      },
      createMany: async ({ data }: any) => {
        row.materials = data;
      },
    },
  };
  const db = {
    $transaction: async (work: any) => {
      const before = structuredClone(row);
      try {
        return await work(tx);
      } catch (error) {
        row = before;
        throw error;
      }
    },
  };
  const adapter = {
    locked: async () => {
      calls.push("availability");
      return { reviewed: true, hasActiveCompatible: true };
    },
  };
  return {
    repository: new PrismaProcedureRepository(db as any, adapter as any),
    calls,
    state: () => row,
    fail: () => {
      fail = true;
    },
  };
}
test("repository mantém IDs ao editar/remover opções, sem deleteMany de variações", async () => {
  const f = fixture();
  await f.repository.updateLocked(1, (procedure) =>
    procedure.replaceOptions([
      {
        id: 10,
        groupName: "Corpo",
        name: "Axilas completas",
        reference: null,
        price: 95,
        active: true,
      },
    ]),
  );
  assert.equal(f.state().variations.length, 2);
  assert.equal(f.state().variations[0].id, 10);
  assert.equal(f.state().variations[0].name, "Axilas completas");
  assert.equal(f.state().variations[1].active, false);
  assert.deepEqual(f.calls.slice(0, 2), ["lock", "availability"]);
});
test("falha ao atualizar opção reverte metadados no limite transacional simulado", async () => {
  const f = fixture();
  f.fail();
  await assert.rejects(
    f.repository.updateLocked(1, (procedure) => {
      procedure.updateDetails({
        categoryId: 1,
        name: "Outro nome",
        description: null,
        durationMinutes: 30,
        price: 100,
      });
      procedure.replaceOptions([
        {
          id: 10,
          groupName: "Corpo",
          name: "Outro",
          reference: null,
          price: 90,
          active: true,
        },
      ]);
    }),
  );
  assert.equal(f.state().name, "Tratamento");
  assert.equal(f.state().variations[0].name, "Axilas");
});
test("adapter de compatibilidade bloqueia aparelhos por ID e só considera ACTIVE", async () => {
  const calls: number[] = [];
  const tx = {
    procedureEquipment: {
      findMany: async () => [{ equipmentId: 4 }, { equipmentId: 2 }],
    },
    $queryRaw: async (_strings: TemplateStringsArray, id: number) => {
      calls.push(id);
      return [{ id, status: id === 2 ? "MAINTENANCE" : "ACTIVE" }];
    },
  };
  const adapter = new EquipmentCompatibilityAdapter({} as any);
  assert.deepEqual(await adapter.locked(tx as any, 1, true), {
    reviewed: true,
    hasActiveCompatible: true,
  });
  assert.deepEqual(calls, [2, 4]);
});
