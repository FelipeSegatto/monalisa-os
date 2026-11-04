import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaEquipmentRepository } from "../../src/equipments/infrastructure/prisma-equipment.repository";
import { Equipment } from "../../src/equipments/domain/equipment";

function fixture() {
  const root = {
    id: 1,
    code: "EQ-001",
    name: "Aparelho",
    manufacturer: null,
    model: null,
    serialNumber: null,
    status: "ACTIVE",
    shotTracking: "COMPONENT",
    maintenanceIntervalMonths: 12,
    lastMaintenanceDate: null,
    nextMaintenanceDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let state: { root: any; components: any[]; events: any[]; review: any } = {
    root,
    components: [],
    events: [],
    review: null,
  };
  const calls: string[] = [];
  let failEvent = false;
  const db = {
    $transaction: async (fn: any) => {
      const before = structuredClone(state);
      calls.push("begin");
      const tx = {
        $queryRaw: async (strings: TemplateStringsArray, id: number) => {
          calls.push(
            strings.join("").includes("Procedure")
              ? "lock-procedure"
              : `lock-${id}`,
          );
          return [{ id }];
        },
        equipment: {
          findUniqueOrThrow: async () => ({
            ...state.root,
            components: structuredClone(state.components),
          }),
          update: async ({ data }: any) => {
            calls.push("save");
            state.root = { ...state.root, ...data };
            return state.root;
          },
          create: async ({ data }: any) => {
            state.root = { ...state.root, ...data };
            return state.root;
          },
        },
        equipmentComponent: {
          create: async ({ data }: any) => {
            const row = { ...data, id: state.components.length + 1 };
            state.components.push(row);
            return row;
          },
          update: async ({ where, data }: any) => {
            calls.push("component-update");
            const index = state.components.findIndex((c) => c.id === where.id);
            state.components[index] = { ...state.components[index], ...data };
            return state.components[index];
          },
        },
        equipmentEvent: {
          create: async ({ data }: any) => {
            calls.push("event");
            if (failEvent) throw new Error("Falha na auditoria");
            state.events.push(data);
            return data;
          },
        },
        procedureEquipment: {
          findMany: async () => [],
          updateMany: async () => {
            calls.push("links");
          },
          upsert: async () => {},
        },
        procedure: {
          update: async ({ data }: any) => {
            state.review = data;
          },
        },
      };
      try {
        const result = await fn(tx);
        calls.push("commit");
        return result;
      } catch (error) {
        state = before;
        calls.push("rollback");
        throw error;
      }
    },
  };
  return {
    repository: new PrismaEquipmentRepository(db as any),
    calls,
    state: () => state,
    failEvent: () => {
      failEvent = true;
    },
  };
}
test("repository bloqueia antes de reconstituir/mudar e salva estado com evento na mesma transação", async () => {
  const f = fixture();
  await f.repository.updateLocked(1, 7, (equipment) =>
    equipment.retire("Fim da vida útil"),
  );
  assert.deepEqual(f.calls, ["begin", "lock-1", "save", "event", "commit"]);
  assert.equal(f.state().root.status, "RETIRED");
  assert.equal(f.state().events[0].actorId, 7);
});
test("falha ao persistir auditoria reverte a mudança no limite transacional", async () => {
  const f = fixture();
  f.failEvent();
  await assert.rejects(
    f.repository.updateLocked(1, 7, (equipment) =>
      equipment.retire("Fim de uso"),
    ),
    /Falha na auditoria/,
  );
  assert.equal(f.state().root.status, "ACTIVE");
  assert.equal(f.state().events.length, 0);
  assert.equal(f.calls.at(-1), "rollback");
});
test("id gerado do componente é associado ao evento correto sem transferir sua propriedade", async () => {
  const f = fixture();
  await f.repository.updateLocked(1, 7, (equipment) =>
    equipment.addComponent("COMP-001", { name: "Cartucho" }),
  );
  assert.equal(f.state().components[0].equipmentId, 1);
  assert.equal(f.state().events[0].componentId, 1);
  assert.equal(f.state().events[0].type, "COMPONENT_CREATED");
});
test("criação do agregado e eventos é atômica, incluindo componentes adicionados antes de salvar", async () => {
  const f = fixture();
  const equipment = Equipment.create("EQ-002", {
    name: "Novo",
    shotTracking: "COMPONENT",
    maintenanceIntervalMonths: 12,
  });
  equipment.addComponent("COMP-001", { name: "Cartucho" });
  await f.repository.create(equipment, 7);
  assert.equal(f.state().events.length, 2);
  assert.equal(f.state().components.length, 1);
});
test("revisão vazia persiste data e autoria sem exigir recurso", async () => {
  const f = fixture();
  await f.repository.reviseProcedureResources(3, [], 7);
  assert.equal(f.state().review.equipmentReviewedById, 7);
  assert.ok(f.state().review.equipmentReviewedAt instanceof Date);
  assert.deepEqual(f.calls, ["begin", "lock-procedure", "links", "commit"]);
});
test("compatibilidade usa ordem estável de locks para todos os aparelhos envolvidos", async () => {
  const f = fixture();
  await f.repository.reviseProcedureResources(3, [4, 2], 7);
  assert.deepEqual(
    f.calls.filter((call) => call.startsWith("lock-")),
    ["lock-procedure", "lock-2", "lock-4"],
  );
});

test("alterar o aparelho não regrava componentes intactos nem falseia suas datas de atualização", async () => {
  const f = fixture();
  await f.repository.updateLocked(1, 7, (equipment) =>
    equipment.addComponent("COMP-001", { name: "Cartucho" }),
  );
  f.calls.length = 0;
  await f.repository.updateLocked(1, 7, (equipment) =>
    equipment.changeStatus("MAINTENANCE", "Revisão anual"),
  );
  assert.equal(f.calls.includes("component-update"), false);
  assert.equal(f.state().components[0].status, "ACTIVE");
  assert.equal(f.state().root.status, "MAINTENANCE");
});
