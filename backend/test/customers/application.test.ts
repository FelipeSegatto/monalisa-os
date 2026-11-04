import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Customer } from "../../src/customers/domain/customer";
import { CustomerService } from "../../src/customers/application/customer.service";
const data = {
  name: "Cliente",
  phone: "11999990000",
  email: null,
  birthDate: null,
  acquisitionSource: "OUTRO" as const,
};
test("service de cliente coordena entidade e repository sem depender de ORM", async () => {
  let writes = 0;
  const customer = Customer.restore({ id: 1, ...data });
  const repository = {
    find: async () => customer,
    save: async () => {
      writes++;
    },
  };
  const queries = {
    detail: async () => ({
      ...customer.snapshot(),
      id: 1,
      createdAt: "2030-01-01T12:00:00Z",
      acquisitionSourceLabel: "Outro",
      nextAppointment: null,
      history: [],
    }),
  };
  const service = new CustomerService(repository as any, queries as any);
  const result = await service.update(1, { ...data, name: "Novo nome" });
  assert.equal(result.name, "Novo nome");
  assert.equal(writes, 1);
  await assert.rejects(service.update(1, { ...data, birthDate: "2026-02-30" }));
  assert.equal(writes, 1);
  assert.equal(customer.snapshot().name, "Novo nome");
});
test("service de notas rejeita nota fora da cliente antes de escrever", async () => {
  let writes = 0;
  const repository = {
    findNote: async () => null,
    saveNote: async () => {
      writes++;
    },
  };
  const service = new CustomerService(repository as any, {} as any);
  await assert.rejects(
    service.updateNote(2, 1, "Título", "Texto"),
    /Nota não encontrada/,
  );
  assert.equal(writes, 0);
});
