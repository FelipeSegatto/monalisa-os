import assert from "node:assert/strict";
import { test } from "node:test";
import { Equipment } from "../../src/equipments/domain/equipment";
import { EquipmentComponent } from "../../src/equipments/domain/equipment-component";
import { CivilDate } from "../../src/equipments/domain/civil-date";
import { MaintenanceSchedule } from "../../src/equipments/domain/maintenance-schedule";
import { EquipmentError } from "../../src/equipments/domain/equipment-error";

const data = {
  name: "Ultramed",
  shotTracking: "COMPONENT" as const,
  maintenanceIntervalMonths: 12,
};
const today = CivilDate.from("2026-11-04");
const fresh = () => Equipment.create("EQ-001", data);
function persisted() {
  const state = fresh().snapshot();
  return Equipment.restore({
    ...state,
    id: 1,
    components: [
      {
        id: 2,
        code: "COMP-001",
        name: "Cartucho",
        status: "ACTIVE",
        specification: null,
        serialNumber: null,
        nominalCapacity: null,
      },
    ],
  });
}
test("data civil rejeita datas inexistentes e ajusta fim do mês e ano bissexto", () => {
  assert.throws(() => CivilDate.from("2026-02-30"), EquipmentError);
  assert.equal(
    CivilDate.from("2024-02-29").addMonths(12).toString(),
    "2025-02-28",
  );
  assert.equal(
    CivilDate.from("2026-01-31").addMonths(1).toString(),
    "2026-02-28",
  );
  assert.equal(
    CivilDate.from("2026-11-04").addMonths(12).toString(),
    "2027-11-04",
  );
  assert.equal(CivilDate.from("2026-11-04").toString(), "2026-11-04");
});
test("programação é imutável e distingue desconhecido, atraso, janela de 30 dias e aposentadoria", () => {
  const schedule = MaintenanceSchedule.empty();
  assert.equal(schedule.state(today), "UNKNOWN");
  assert.equal(
    schedule.schedule(CivilDate.from("2026-11-03")).state(today),
    "OVERDUE",
  );
  assert.equal(schedule.schedule(today).state(today), "DUE_SOON");
  assert.equal(
    schedule.schedule(CivilDate.from("2026-12-04")).state(today),
    "DUE_SOON",
  );
  assert.equal(
    schedule.schedule(CivilDate.from("2026-12-05")).state(today),
    "OK",
  );
  assert.equal(schedule.schedule(today).state(today, true), "NOT_APPLICABLE");
  assert.equal(schedule.snapshot().nextMaintenanceDate, null);
  assert.throws(() => MaintenanceSchedule.empty(0));
});
test("entidade valida valores mesmo sem HTTP, Zod ou banco", () => {
  assert.throws(
    () => Equipment.create("EQ-001", { ...data, name: " " }),
    EquipmentError,
  );
  assert.throws(
    () =>
      Equipment.create("EQ-001", { ...data, maintenanceIntervalMonths: -1 }),
    EquipmentError,
  );
  assert.throws(
    () =>
      EquipmentComponent.create("COMP-001", {
        name: "Cartucho",
        nominalCapacity: 0,
      }),
    EquipmentError,
  );
  const equipment = fresh();
  equipment.addComponent("COMP-001", { name: "Cartucho" });
  assert.equal(equipment.snapshot().components[0].nominalCapacity, null);
  assert.equal(equipment.snapshot().nextMaintenanceDate, null);
});
test("reconstituição não produz eventos e snapshots não permitem alterar o agregado", () => {
  const equipment = persisted();
  const snapshot = equipment.snapshot();
  snapshot.name = "Invadido";
  snapshot.components[0].status = "RETIRED";
  assert.equal(equipment.snapshot().name, "Ultramed");
  assert.equal(equipment.snapshot().components[0].status, "ACTIVE");
  assert.equal(equipment.pendingEvents.length, 0);
});
test("alteração inválida não modifica estado nem produz evento", () => {
  const equipment = persisted();
  const before = equipment.snapshot();
  assert.throws(() =>
    equipment.update({
      ...data,
      name: "Mudança parcial",
      maintenanceIntervalMonths: 0,
    }),
  );
  assert.deepEqual(equipment.snapshot(), before);
  assert.equal(equipment.pendingEvents.length, 0);
});
test("agregado controla aposentadoria definitiva e protege todos os componentes", () => {
  const equipment = persisted();
  equipment.retire("Fim da vida útil");
  for (const action of [
    () => equipment.addComponent("COMP-002", { name: "Novo" }),
    () => equipment.update(data),
    () => equipment.changeStatus("ACTIVE", "Reativar"),
    () => equipment.updateComponent(2, { name: "Outro" }),
    () => equipment.scheduleMaintenance(today, "Revisar"),
  ])
    assert.throws(action, EquipmentError);
  assert.equal(equipment.pendingEvents.length, 1);
  assert.equal(equipment.snapshot().components[0].status, "ACTIVE");
});
test("componente aposentado não pode ser editado e componente externo é rejeitado", () => {
  const equipment = persisted();
  equipment.changeComponentStatus(2, "RETIRED", "Fim da vida útil");
  assert.throws(() => equipment.updateComponent(2, { name: "Outro" }));
  assert.throws(() => equipment.changeComponentStatus(2, "ACTIVE", "Reativar"));
  assert.throws(
    () => equipment.updateComponent(99, { name: "Outro" }),
    (error) => error instanceof EquipmentError && error.kind === "NOT_FOUND",
  );
});
test("componentes duplicados, estado repetido e justificativa vazia são rejeitados", () => {
  const equipment = persisted();
  assert.throws(() =>
    equipment.addComponent("COMP-001", { name: "Duplicado" }),
  );
  assert.throws(() => equipment.changeStatus("ACTIVE", "Sem mudança"));
  assert.throws(() => equipment.changeStatus("MAINTENANCE", " "));
  assert.equal(equipment.pendingEvents.length, 0);
});
test("manutenção gera fatos de negócio, calcula a próxima e rejeita futuro e repetição", () => {
  const equipment = persisted();
  equipment.recordMaintenance(
    CivilDate.from("2024-02-29"),
    today,
    "Revisão anual",
  );
  assert.equal(equipment.snapshot().nextMaintenanceDate, "2025-02-28");
  assert.throws(() =>
    equipment.recordMaintenance(
      CivilDate.from("2024-02-29"),
      today,
      "Repetida",
    ),
  );
  assert.throws(() =>
    equipment.recordMaintenance(
      CivilDate.from("2027-01-01"),
      today,
      "No futuro",
    ),
  );
  assert.throws(() =>
    equipment.scheduleMaintenance(CivilDate.from("2024-02-28"), "Reagendar"),
  );
  const event = equipment.pendingEvents[0];
  assert.equal(event.type, "MAINTENANCE_COMPLETED");
  assert.equal(event.occurredOn, "2024-02-29");
  const details = event.details;
  details.nextDate = "Invadido";
  assert.equal(event.details.nextDate, "2025-02-28");
});
test("trocar intervalo não altera programação existente; uso explícito de próxima data é respeitado", () => {
  const equipment = persisted();
  equipment.scheduleMaintenance(
    CivilDate.from("2027-01-01"),
    "Data contratada",
  );
  equipment.update({ ...data, maintenanceIntervalMonths: 6 });
  assert.equal(equipment.snapshot().nextMaintenanceDate, "2027-01-01");
  equipment.recordMaintenance(
    CivilDate.from("2026-11-01"),
    today,
    "Realizada",
    CivilDate.from("2027-02-01"),
  );
  assert.equal(equipment.snapshot().nextMaintenanceDate, "2027-02-01");
});
test("compatibilidade pode ser retirada de aposentado, mas não concedida", () => {
  const equipment = persisted();
  equipment.retire("Fim de uso");
  assert.throws(() => equipment.reviewCompatibility(3, true));
  equipment.reviewCompatibility(3, false);
  assert.equal(equipment.pendingEvents[1].type, "PROCEDURE_COMPATIBILITY");
});

test("campos opcionais omitidos preservam valores; null explícito limpa sem mudar identidade", () => {
  const equipment = Equipment.create("EQ-001", {
    ...data,
    manufacturer: "Fabricante",
    serialNumber: "123",
  });
  equipment.update({ ...data, name: "Novo nome" });
  assert.equal(equipment.snapshot().manufacturer, "Fabricante");
  assert.equal(equipment.snapshot().serialNumber, "123");
  equipment.update({ ...data, manufacturer: null });
  assert.equal(equipment.snapshot().manufacturer, null);
  const component = EquipmentComponent.create("COMP-001", {
    name: "Cartucho",
    nominalCapacity: 1000,
    serialNumber: "456",
  });
  component.update({ name: "Nome revisado" });
  assert.equal(component.snapshot().nominalCapacity, 1000);
  assert.equal(component.snapshot().serialNumber, "456");
  component.update({ name: "Nome revisado", nominalCapacity: null });
  assert.equal(component.snapshot().nominalCapacity, null);
  assert.equal(component.code, "COMP-001");
});

test("reconstituição do componente descarta detalhes de persistência e não expõe datas mutáveis", () => {
  const component = EquipmentComponent.restore({
    id: 2,
    code: "COMP-001",
    name: "Cartucho",
    status: "ACTIVE",
    nominalCapacity: null,
    specification: null,
    serialNumber: null,
    equipmentId: 1,
    createdAt: new Date(),
  } as any);
  assert.equal("createdAt" in component.snapshot(), false);
  assert.equal("equipmentId" in component.snapshot(), false);
});
