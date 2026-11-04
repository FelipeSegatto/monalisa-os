import assert from "node:assert/strict";
import { test } from "node:test";
test("seed repetido preserva cadastro, capacidade, status e histórico existentes", async () => {
  const { equipmentManifest, importEquipment } =
    await import("../../prisma/equipment-seed-data");
  let item: any = null,
    component: any = null;
  const events: any[] = [];
  const tx = {
    equipment: {
      upsert: async ({ create }: any) => {
        if (!item) {
          item = { id: 1, ...create };
          events.push(create.events.create);
        }
        return item;
      },
    },
    equipmentComponent: {
      findUnique: async () => component,
      create: async ({ data }: any) => {
        component = { id: 2, ...data };
        return component;
      },
    },
    equipmentEvent: {
      create: async ({ data }: any) => {
        events.push(data);
      },
    },
  };
  const data = equipmentManifest.parse({
    equipment: [
      {
        code: "EQ-001",
        name: "Aparelho",
        components: [{ code: "COMP-001", name: "Cartucho" }],
      },
    ],
  });
  await importEquipment(tx as any, 7, data);
  item.name = "Nome revisado";
  item.status = "MAINTENANCE";
  component.nominalCapacity = 999;
  const count = events.length;
  await importEquipment(tx as any, 7, data);
  assert.equal(events.length, count);
  assert.equal(item.name, "Nome revisado");
  assert.equal(item.status, "MAINTENANCE");
  assert.equal(component.nominalCapacity, 999);
  component.equipmentId = 99;
  await assert.rejects(
    importEquipment(tx as any, 7, data),
    /outro equipamento/,
  );
});
