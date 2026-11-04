import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { EquipmentController } from "../src/modules/equipment.controller";
import { EquipmentService } from "../src/modules/equipment.service";
import {
  equipmentInput,
  componentInput,
  calendarDate,
} from "../src/modules/equipment.inputs";
import {
  addCalendarMonths,
  maintenanceState,
  validDate,
} from "../src/domain/equipment-policy";
import { SessionGuard } from "../src/auth/auth.guard";

const today = "2026-11-04";
test("manutenção: meses de calendário preservam fim do mês e ano bissexto", () => {
  assert.equal(addCalendarMonths("2024-02-29", 12), "2025-02-28");
  assert.equal(addCalendarMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addCalendarMonths("2026-11-04", 12), "2027-11-04");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(calendarDate.safeParse("2026-02-30").success, false);
});
test("lembretes distinguem ausência de data, atraso, vencimento próximo e aposentadoria", () => {
  assert.equal(maintenanceState("ACTIVE", null, today), "UNKNOWN");
  assert.equal(maintenanceState("ACTIVE", "2026-11-03", today), "OVERDUE");
  assert.equal(maintenanceState("ACTIVE", today, today), "DUE_SOON");
  assert.equal(maintenanceState("ACTIVE", "2026-12-04", today), "DUE_SOON");
  assert.equal(maintenanceState("ACTIVE", "2026-12-05", today), "OK");
  assert.equal(
    maintenanceState("RETIRED", "2020-01-01", today),
    "NOT_APPLICABLE",
  );
});
test("capacidade desconhecida não vira zero; campos calculados e transferência são rejeitados", () => {
  assert.equal(
    componentInput.parse({ name: "Cartucho" }).nominalCapacity,
    undefined,
  );
  assert.equal(
    componentInput.safeParse({ name: "Cartucho", nominalCapacity: 0 }).success,
    false,
  );
  assert.equal(
    componentInput.safeParse({ name: "Cartucho", equipmentId: 2 }).success,
    false,
  );
  assert.equal(
    equipmentInput.safeParse({ name: "Aparelho", totalShots: 0 }).success,
    false,
  );
  assert.equal(
    equipmentInput.parse({ name: "Aparelho" }).maintenanceIntervalMonths,
    12,
  );
});
function fixture(status = "ACTIVE", last: Date | null = null) {
  const calls: string[] = [];
  const updates: any[] = [];
  const events: any[] = [];
  const item = {
    id: 1,
    status,
    lastMaintenanceDate: last,
    nextMaintenanceDate: null,
    maintenanceIntervalMonths: 12,
  };
  const tx = {
    $queryRaw: async () => {
      calls.push("lock");
      return [{ id: 1 }];
    },
    equipment: {
      findUniqueOrThrow: async () => item,
      update: async (data: any) => {
        calls.push("update");
        updates.push(data);
        return item;
      },
    },
    equipmentEvent: {
      create: async (data: any) => {
        calls.push("event");
        events.push(data);
      },
    },
    equipmentComponent: {
      findFirst: async () => null,
      create: async () => {
        calls.push("component");
        return { id: 2 };
      },
    },
  };
  const db = { $transaction: async (fn: any) => fn(tx) };
  const service = new EquipmentService(db as any);
  service.detail = async () => item as any;
  return { service, calls, updates, events };
}
test("manutenção usa bloqueio, calcula próxima data e registra autoria na mesma transação", async () => {
  const f = fixture();
  await f.service.maintenance(1, "2024-02-29", undefined, "Revisão anual", 7);
  assert.deepEqual(f.calls, ["lock", "update", "event"]);
  assert.equal(
    f.updates[0].data.nextMaintenanceDate.toISOString().slice(0, 10),
    "2025-02-28",
  );
  assert.equal(f.events[0].data.actorId, 7);
  assert.equal(f.events[0].data.type, "MAINTENANCE_COMPLETED");
});
test("manutenção rejeita data futura, repetida e próxima anterior à realização", async () => {
  const f = fixture();
  await assert.rejects(
    f.service.maintenance(1, "9999-01-01", undefined, "Teste", 7),
  );
  assert.equal(f.updates.length, 0);
  await assert.rejects(
    f.service.maintenance(1, "2024-02-29", "2024-02-28", "Teste", 7),
  );
  assert.equal(f.updates.length, 0);
  const repeated = fixture("ACTIVE", new Date("2024-02-29"));
  await assert.rejects(
    repeated.service.maintenance(1, "2024-02-29", undefined, "Teste", 7),
  );
  assert.equal(repeated.updates.length, 0);
});
test("equipamento aposentado não aceita novos componentes ou reativação", async () => {
  const f = fixture("RETIRED");
  await assert.rejects(f.service.component(1, { name: "Novo cartucho" }, 7));
  await assert.rejects(f.service.status(1, "ACTIVE", "Reativar", 7));
  assert.equal(f.updates.length, 0);
  assert.equal(f.events.length, 0);
});
test("componente de outro aparelho não pode ter seu status alterado", async () => {
  const f = fixture();
  await assert.rejects(f.service.status(1, "MAINTENANCE", "Revisar", 7, 999));
  assert.equal(f.events.length, 0);
});
test("programação de manutenção exige data posterior à última realizada", async () => {
  const f = fixture("ACTIVE", new Date("2024-02-29"));
  await assert.rejects(f.service.schedule(1, "2024-02-29", "Reagendar", 7));
  assert.equal(f.updates.length, 0);
});
test("todas as escritas de equipamento são marcadas como exclusivas de administrador", () => {
  for (const method of [
    "create",
    "update",
    "component",
    "updateComponent",
    "status",
    "componentStatus",
    "schedule",
    "maintenance",
    "compatibility",
  ]) {
    assert.equal(
      Reflect.getMetadata(
        "adminOnly",
        (EquipmentController.prototype as any)[method],
      ),
      true,
      method,
    );
  }
  assert.equal(
    Reflect.getMetadata("isPublic", EquipmentController.prototype.list),
    undefined,
  );
});
test("guard rejeita funcionário em escrita administrativa antes de chamar o controller", async () => {
  const { hashToken } = await import("../src/auth/security");
  const token = "a".repeat(64);
  const guard = new SessionGuard(
    {
      session: {
        findUnique: async ({ where }: any) => {
          assert.equal(where.tokenHash, hashToken(token));
          return {
            expiresAt: new Date(Date.now() + 60000),
            user: {
              id: 1,
              name: "Equipe",
              role: "FUNCIONARIO",
              professionalId: 1,
            },
          };
        },
      },
    } as any,
    { getAllAndOverride: (key: string) => key === "adminOnly" } as any,
  );
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { cookie: `clinic_session=${token}` },
        method: "POST",
      }),
    }),
    getHandler: () => EquipmentController.prototype.create,
    getClass: () => EquipmentController,
  };
  await assert.rejects(guard.canActivate(context as any), /Acesso restrito/);
});

test("seed repetido preserva cadastro, capacidade, status e histórico existentes", async () => {
  const { equipmentManifest, importEquipment } =
    await import("../prisma/equipment-seed-data");
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

test("revisão vazia é válida: desativa vínculos e preserva autoria sem exigir equipamento", async () => {
  const calls: string[] = [];
  const tx = {
    $queryRaw: async () => [{ id: 3 }],
    procedureEquipment: {
      findMany: async () => [],
      updateMany: async () => {
        calls.push("deactivate");
      },
    },
    procedure: {
      update: async ({ data }: any) => {
        assert.equal(data.equipmentReviewedById, 7);
        assert.ok(data.equipmentReviewedAt instanceof Date);
        calls.push("review");
      },
    },
  };
  const service = new EquipmentService({
    $transaction: async (fn: any) => fn(tx),
  } as any);
  service.procedureResources = async () => ({
    reviewedAt: new Date(),
    materialsReviewedAt: null,
    equipment: [],
  });
  const result = await service.setProcedureResources(3, [], 7);
  assert.equal(result.equipment.length, 0);
  assert.ok(result.reviewedAt);
  assert.deepEqual(calls, ["deactivate", "review"]);
});
