import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaEmployeeAccountRepository } from "../../src/auth/infrastructure/prisma-employee-account.repository";
import { PrismaSessionRepository } from "../../src/auth/infrastructure/prisma-auth.repositories";
test("troca de credenciais e revogação compartilham transação e preservam papel", async () => {
  let account = {
    id: 2,
    role: "ADMIN",
    email: "old@example.test",
    passwordHash: "old",
  };
  const calls: string[] = [];
  let revoked = false;
  const tx = {
    $queryRaw: async () => {
      calls.push("lock-professional");
      return [{ id: 1, name: "Profissional" }];
    },
    user: {
      findUnique: async () => account,
      update: async ({ data }: any) => {
        assert.deepEqual(Object.keys(data).sort(), ["email", "passwordHash"]);
        account = { ...account, ...data };
        calls.push("update");
      },
    },
    session: {
      deleteMany: async () => {
        revoked = true;
        calls.push("revoke");
      },
    },
  };
  const db = { $transaction: async (work: any) => work(tx) };
  await new PrismaEmployeeAccountRepository(db as any).provision(
    1,
    "new@example.test",
    "new",
  );
  assert.deepEqual(calls, ["lock-professional", "update", "revoke"]);
  assert.equal(revoked, true);
  assert.equal(account.role, "ADMIN");
});
test("falha na revogação reverte a troca no limite transacional simulado", async () => {
  let hash = "old";
  const tx = {
    $queryRaw: async () => [{ id: 1, name: "Profissional" }],
    user: {
      findUnique: async () => ({ id: 2 }),
      update: async ({ data }: any) => {
        hash = data.passwordHash;
      },
    },
    session: {
      deleteMany: async () => {
        throw new Error("Falha na revogação");
      },
    },
  };
  const db = {
    $transaction: async (work: any) => {
      const before = hash;
      try {
        return await work(tx);
      } catch (error) {
        hash = before;
        throw error;
      }
    },
  };
  await assert.rejects(
    new PrismaEmployeeAccountRepository(db as any).provision(
      1,
      "new@example.test",
      "new",
    ),
  );
  assert.equal(hash, "old");
});
test("login concorrente não cria sessão se a credencial verificada já mudou", async () => {
  let writes = 0;
  const calls: string[] = [];
  const tx = {
    $queryRaw: async () => {
      calls.push("lock-user");
      return [{ id: 2, passwordHash: "new" }];
    },
    session: {
      create: async () => {
        calls.push("create-session");
        writes++;
      },
    },
  };
  const repository = new PrismaSessionRepository({
    $transaction: async (work: any) => work(tx),
  } as any);
  await assert.rejects(
    repository.create("token-hash", 2, 1000, "old"),
    /Email ou senha inválidos/,
  );
  assert.equal(writes, 0);
  await repository.create("token-hash", 2, 1000, "new");
  assert.equal(writes, 1);
  assert.deepEqual(calls, ["lock-user", "lock-user", "create-session"]);
});
