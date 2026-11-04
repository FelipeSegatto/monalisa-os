import assert from "node:assert/strict";
import { test } from "node:test";
import { bootstrapAdmin } from "../../prisma/bootstrap-admin";
import { assertDemoSeedAllowed } from "../../prisma/seed-safety";

test("bootstrap preserva administrador existente, sem trocar senha ou criar demonstração", async () => {
  const db = {
    user: {
      findUnique: async () => ({ role: "ADMIN" }),
      upsert: async () => {
        throw new Error("Não deveria escrever");
      },
    },
  };
  await bootstrapAdmin(db as any, {
    email: "admin@example.test",
    name: "Administrador",
    password: "SenhaSomenteTeste123!",
  });
});
test("bootstrap não promove funcionário e nova conta nunca usa update para redefinir senha", async () => {
  await assert.rejects(
    bootstrapAdmin(
      { user: { findUnique: async () => ({ role: "FUNCIONARIO" }) } } as any,
      {
        email: "equipe@example.test",
        name: "Administrador",
        password: "SenhaSomenteTeste123!",
      },
    ),
  );
  let value: any;
  const db = {
    user: {
      findUnique: async () => null,
      upsert: async (data: any) => {
        value = data;
        return { role: "ADMIN" };
      },
    },
  };
  await bootstrapAdmin(db as any, {
    email: "ADMIN@example.test",
    name: "Administrador",
    password: "SenhaSomenteTeste123!",
  });
  assert.deepEqual(value.update, {});
  assert.equal(value.create.email, "admin@example.test");
  assert.match(value.create.passwordHash, /^scrypt:/);
});
test("seed de demonstração exige confirmação e é recusado em produção", () => {
  assert.throws(() => assertDemoSeedAllowed([], "development"));
  assert.throws(() => assertDemoSeedAllowed(["--confirm-demo"], "production"));
  assert.doesNotThrow(() => assertDemoSeedAllowed(["--confirm-demo"], "test"));
});
