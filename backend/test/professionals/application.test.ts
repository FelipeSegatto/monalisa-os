import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Professional } from "../../src/professionals/domain/professional";
import { ProfessionalService } from "../../src/professionals/application/professional.service";
import { EmployeeAccountService } from "../../src/auth/application/employee-account.service";
test("profissional ausente não dispara criação de conta ou derivação de senha", async () => {
  let calls = 0;
  const service = new ProfessionalService(
    { find: async () => null } as any,
    {} as any,
    {
      configure: async () => {
        calls++;
      },
    } as any,
  );
  await assert.rejects(
    service.configureAccount(99, "email@example.test", "SenhaTeste123!"),
  );
  assert.equal(calls, 0);
});
test("cadastro profissional e conta são casos separados com contratos próprios", async () => {
  const professional = Professional.restore({
    id: 1,
    name: "Profissional",
    phone: null,
    email: null,
    color: "#0d9488",
    active: true,
  });
  let accountCalls = 0;
  const service = new ProfessionalService(
    { find: async () => professional, save: async () => {} } as any,
    { detail: async () => professional.snapshot() } as any,
    {
      find: async () => {
        accountCalls++;
        return { hasAccount: false, email: null };
      },
    } as any,
  );
  await service.update(1, {
    name: "Nome revisado",
    phone: null,
    email: null,
    color: null,
    active: false,
  });
  assert.equal(accountCalls, 0);
  assert.equal(professional.snapshot().active, false);
  assert.deepEqual(await service.account(1), {
    hasAccount: false,
    email: null,
  });
});
test("conta entrega apenas hash ao repository e nunca senha no retorno", async () => {
  let saved: any;
  const repository = {
    provision: async (...args: any[]) => {
      saved = args;
    },
    find: async () => ({ email: "equipe@example.test" }),
  };
  const passwords = {
    hash: async (password: string) => {
      assert.equal(password, "SenhaTeste123!");
      return "hash-opaco";
    },
    verify: async () => false,
  };
  const service = new EmployeeAccountService(repository as any, passwords);
  const result = await service.configure(
    1,
    "EQUIPE@example.test",
    "SenhaTeste123!",
  );
  assert.deepEqual(saved, [1, "equipe@example.test", "hash-opaco"]);
  assert.deepEqual(result, { hasAccount: true, email: "equipe@example.test" });
});
