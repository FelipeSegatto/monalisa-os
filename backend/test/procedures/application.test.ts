import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Procedure } from "../../src/procedures/domain/procedure";
import { ProcedureService } from "../../src/procedures/application/procedure.service";
const details = {
  categoryId: 1,
  name: "Tratamento",
  description: null,
  durationMinutes: 30,
  price: 100,
};
test("service cria rascunho obrigatório e não grava ativação sem equipamento", async () => {
  let writes = 0;
  const repository = {
    create: async () => {
      writes++;
      return 1;
    },
  };
  const queries = { detail: async () => ({ id: 1 }) };
  const service = new ProcedureService(
    repository as any,
    queries as any,
    {} as any,
  );
  await assert.rejects(
    service.create({
      ...details,
      technology: "HIFU",
      requiresEquipment: true,
      active: true,
      variations: [],
    }),
  );
  assert.equal(writes, 0);
  await service.create({
    ...details,
    technology: "HIFU",
    requiresEquipment: true,
    active: false,
    variations: [],
  });
  assert.equal(writes, 1);
});
test("ativação usa contexto de disponibilidade dentro do repository bloqueado", async () => {
  const procedure = Procedure.restore({
    ...Procedure.create(details).snapshot(),
    id: 1,
    technology: "HIFU",
    requiresEquipment: true,
  });
  let valid = false;
  let writes = 0;
  const repository = {
    updateLocked: async (_id: number, change: any) => {
      change(procedure, { reviewed: valid, hasActiveCompatible: valid });
      writes++;
    },
  };
  const queries = { detail: async () => procedure.snapshot() };
  const service = new ProcedureService(
    repository as any,
    queries as any,
    {} as any,
  );
  await assert.rejects(service.setActive(1, true));
  assert.equal(writes, 0);
  valid = true;
  await service.setActive(1, true);
  assert.equal(procedure.snapshot().active, true);
});
