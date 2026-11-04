import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { EquipmentService } from "../../src/equipments/application/equipment.service";
import { EquipmentRepository } from "../../src/equipments/domain/equipment.repository";
import {
  EquipmentQueries,
  EquipmentDetailView,
} from "../../src/equipments/application/equipment.queries";
import { Equipment } from "../../src/equipments/domain/equipment";
import { CivilDate } from "../../src/equipments/domain/civil-date";

function fixture() {
  const initial = Equipment.create("EQ-001", {
    name: "Aparelho",
    shotTracking: "COMPONENT",
    maintenanceIntervalMonths: 12,
  }).snapshot();
  let snapshot = { ...initial, id: 1 };
  const writes: { actorId: number; types: string[] }[] = [];
  let reviews: number[] | null = null;
  const repository: EquipmentRepository = {
    create: async (equipment, actorId) => {
      snapshot = { ...equipment.snapshot(), id: 1 };
      writes.push({
        actorId,
        types: equipment.pendingEvents.map((e) => e.type),
      });
      return 1;
    },
    updateLocked: async (id, actorId, change) => {
      assert.equal(id, 1);
      const equipment = Equipment.restore(snapshot);
      change(equipment);
      snapshot = { ...equipment.snapshot(), id };
      writes.push({
        actorId,
        types: equipment.pendingEvents.map((e) => e.type),
      });
    },
    reviseProcedureResources: async (_id, ids, actorId) => {
      assert.equal(actorId, 7);
      reviews = [...ids];
    },
  };
  const view = (): EquipmentDetailView => ({
    ...snapshot,
    components: [],
    maintenanceState: "UNKNOWN",
    createdAt: new Date(),
    updatedAt: new Date(),
    procedures: [],
    events: [],
  });
  const queries: EquipmentQueries = {
    list: async () => ({ equipment: [view()] }),
    detail: async () => view(),
    history: async () => ({ events: [] }),
    procedureResources: async () => ({
      reviewedAt: reviews === null ? null : new Date(),
      materialsReviewedAt: null,
      equipment: [],
    }),
  };
  const service = new EquipmentService(repository, queries, {
    today: () => CivilDate.from("2026-11-04"),
  });
  return { service, writes, snapshot: () => snapshot };
}
test("service coordena manutenção pelo agregado e transmite autoria sem depender de Prisma", async () => {
  const f = fixture();
  const result = await f.service.maintenance(
    1,
    "2024-02-29",
    undefined,
    "Revisão anual",
    7,
  );
  assert.equal(result.nextMaintenanceDate, "2025-02-28");
  assert.deepEqual(f.writes, [
    { actorId: 7, types: ["MAINTENANCE_COMPLETED"] },
  ]);
});
test("comando rejeitado pelo domínio não é persistido", async () => {
  const f = fixture();
  await assert.rejects(
    f.service.maintenance(1, "2027-01-01", undefined, "Futura", 7),
  );
  assert.equal(f.writes.length, 0);
  assert.equal(f.snapshot().lastMaintenanceDate, null);
});
test("criação gera código e consulta a projeção após persistir", async () => {
  const f = fixture();
  const result = await f.service.create(
    { name: "Novo", shotTracking: "NONE", maintenanceIntervalMonths: 12 },
    7,
  );
  assert.match(result.code, /^EQ-/);
  assert.equal(result.name, "Novo");
  assert.deepEqual(f.writes[0], { actorId: 7, types: ["CREATED"] });
});
test("revisão vazia é válida e duplicatas são rejeitadas antes de persistir", async () => {
  const f = fixture();
  const result = await f.service.setProcedureResources(3, [], 7);
  assert.ok(result.reviewedAt);
  assert.equal(result.equipment.length, 0);
  await assert.rejects(f.service.setProcedureResources(3, [1, 1], 7));
});
