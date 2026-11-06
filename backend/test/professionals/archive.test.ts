import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Professional } from "../../src/professionals/domain/professional";
import { PrismaProfessionalRepository } from "../../src/professionals/infrastructure/prisma-professional.repository";
import {
  PrismaSessionRepository,
  PrismaUserRepository,
} from "../../src/auth/infrastructure/prisma-auth.repositories";
import { PrismaEmployeeAccountRepository } from "../../src/auth/infrastructure/prisma-employee-account.repository";

const profile = {
  id: 1,
  name: "Equipe",
  phone: null,
  email: null,
  color: "#123456",
  active: true,
};
const account = {
  id: 2,
  name: "Equipe",
  email: "equipe@example.test",
  role: "FUNCIONARIO",
  professionalId: 1,
  passwordHash: "hash",
};

test("arquivamento preserva cadastro e revoga sessões na mesma transação; restauração não recria sessões", async () => {
  let row = { ...profile };
  let sessions = [2, 9];
  let fail = false;
  const tx = {
    $queryRaw: async () => [row],
    user: { findUnique: async () => account },
    professional: {
      update: async ({ data }: any) => {
        row = { ...row, ...data };
      },
    },
    session: {
      deleteMany: async ({ where }: any) => {
        if (fail) throw new Error("revocation failed");
        sessions = sessions.filter((id) => id !== where.userId);
      },
    },
  };
  const repository = new PrismaProfessionalRepository({
    $transaction: async (work: any) => {
      const before = { ...row };
      try {
        return await work(tx);
      } catch (error) {
        row = before;
        throw error;
      }
    },
  } as any);
  const professional = Professional.restore(row);
  professional.deactivate();
  fail = true;
  await assert.rejects(repository.save(professional));
  assert.equal(row.active, true);
  assert.deepEqual(sessions, [2, 9]);
  fail = false;
  await repository.save(professional);
  assert.equal(row.active, false);
  assert.equal(row.id, 1);
  assert.deepEqual(sessions, [9]);
  professional.activate();
  await repository.save(professional);
  assert.equal(row.active, true);
  assert.deepEqual(sessions, [9]);
});

test("gestão de funcionários não arquiva conta administrativa", async () => {
  let writes = 0;
  const repository = new PrismaProfessionalRepository({
    $transaction: async (work: any) =>
      work({
        $queryRaw: async () => [profile],
        user: { findUnique: async () => ({ ...account, role: "ADMIN" }) },
        professional: {
          update: async () => {
            writes++;
          },
        },
      }),
  } as any);
  const professional = Professional.restore(profile);
  professional.deactivate();
  await assert.rejects(repository.save(professional), /administrativas/);
  assert.equal(writes, 0);
});

test("profissional arquivado não autentica por senha nem por sessão existente", async () => {
  let active = false;
  const db = {
    user: {
      findUnique: async () => ({ ...account, professional: { active } }),
    },
    session: {
      findUnique: async () => ({
        user: { ...account, professional: { active } },
        expiresAt: new Date(Date.now() + 10000),
      }),
    },
  };
  const users = new PrismaUserRepository(db as any);
  const sessions = new PrismaSessionRepository(db as any);
  assert.equal(await users.findByEmail(account.email), null);
  assert.equal(await sessions.findByHash("token"), null);
  active = true;
  assert.equal((await users.findByEmail(account.email))?.id, 2);
  assert.ok(await sessions.findByHash("token"));
});

test("emissão de sessão revalida situação sob lock, inclusive booleano MySQL numérico", async () => {
  let active: boolean | number = false;
  let writes = 0;
  const repository = new PrismaSessionRepository({
    $transaction: async (work: any) =>
      work({
        $queryRaw: async () => [{ ...account, professionalActive: active }],
        session: {
          create: async () => {
            writes++;
          },
        },
      }),
  } as any);
  await assert.rejects(repository.create("token", 2, 1000, "hash"));
  active = 0;
  await assert.rejects(repository.create("token", 2, 1000, "hash"));
  assert.equal(writes, 0);
  active = 1;
  await repository.create("token", 2, 1000, "hash");
  assert.equal(writes, 1);
});

test("troca de credenciais não contorna arquivamento", async () => {
  let writes = 0;
  const repository = new PrismaEmployeeAccountRepository({
    $transaction: async (work: any) =>
      work({
        $queryRaw: async () => [{ ...profile, active: false }],
        user: {
          findUnique: async () => {
            writes++;
            return account;
          },
        },
      }),
  } as any);
  await assert.rejects(
    repository.provision(1, account.email, "hash"),
    /Restaure/,
  );
  assert.equal(writes, 0);
});
