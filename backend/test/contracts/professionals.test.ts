import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { verifyPassword } from "../../src/auth/security";
import { contractApp } from "./app-harness";
test("profissionais preservam cadastro, contagens e conta administrativa com revogação transacional", async () => {
  const app = await contractApp();
  try {
    let professional: any = null,
      account: any = null;
    let sessions: any[] = [];
    const locks: string[] = [];
    app.db.professional.create = async ({ data }: any) =>
      (professional = { id: 1, ...data });
    app.db.professional.findUnique = async ({ where }: any) =>
      professional?.id === where.id ? professional : null;
    app.db.professional.findMany = async () =>
      professional ? [professional] : [];
    app.db.professional.update = async ({ data }: any) =>
      (professional = { ...professional, ...data });
    app.db.appointment.count = async ({ where }: any) => (where.status ? 2 : 5);
    app.db.user.findUnique = async ({ where }: any) =>
      account?.professionalId === where.professionalId ? account : null;
    app.db.user.create = async ({ data }: any) =>
      (account = { id: 20, ...data });
    app.db.user.update = async ({ data }: any) => {
      if (data.email === "ocupado@example.test")
        throw new Prisma.PrismaClientKnownRequestError("Detalhe privado", {
          code: "P2002",
          clientVersion: "6.19.0",
        });
      account = { ...account, ...data };
      return account;
    };
    app.db.session.deleteMany = async ({ where }: any) => {
      sessions = sessions.filter((session) => session.userId !== where.userId);
      return { count: 1 };
    };
    app.db.$transaction = async (work: any) => {
      const before = structuredClone({ account, sessions });
      try {
        return await work({
          ...app.db,
          $queryRaw: async () => {
            locks.push("professional");
            return professional ? [professional] : [];
          },
        });
      } catch (error) {
        account = before.account;
        sessions = before.sessions;
        throw error;
      }
    };
    await app.start();
    const body = {
      name: "Profissional",
      phone: null,
      email: null,
      color: null,
      active: true,
    };
    assert.equal(
      (
        await app.request("/api/v1/professionals", {
          method: "POST",
          body,
          role: "FUNCIONARIO",
        })
      ).status,
      403,
    );
    const created = await app.request("/api/v1/professionals", {
      method: "POST",
      body,
    });
    assert.equal(created.status, 201);
    const data: any = await created.json();
    assert.equal(data.color, "#0d9488");
    assert.equal(data.upcomingAppointments, 2);
    assert.equal(data.appointmentsThisMonth, 5);
    assert.equal(
      (await app.request("/api/v1/professionals", { role: "FUNCIONARIO" }))
        .status,
      200,
    );
    assert.equal(
      (
        await app.request("/api/v1/professionals/1/account", {
          role: "FUNCIONARIO",
        })
      ).status,
      403,
    );
    assert.deepEqual(
      await (await app.request("/api/v1/professionals/1/account")).json(),
      { hasAccount: false, email: null },
    );
    const configured = await app.request("/api/v1/professionals/1/account", {
      method: "POST",
      body: {
        email: "EQUIPE@example.test",
        password: "SenhaTeste123!",
        role: "ADMIN",
      },
    });
    assert.equal(configured.status, 201);
    assert.deepEqual(await configured.json(), {
      hasAccount: true,
      email: "equipe@example.test",
    });
    assert.equal(account.role, "FUNCIONARIO");
    assert.equal(verifyPassword("SenhaTeste123!", account.passwordHash), true);
    sessions = [{ userId: 20 }, { userId: 999 }];
    const priorHash = account.passwordHash;
    assert.equal(
      (
        await app.request("/api/v1/professionals/1/account", {
          method: "POST",
          body: { email: "ocupado@example.test", password: "OutraSenha123!" },
        })
      ).status,
      409,
    );
    assert.equal(account.passwordHash, priorHash);
    assert.equal(sessions.length, 2);
    const changed = await app.request("/api/v1/professionals/1/account", {
      method: "POST",
      body: { email: "nova@example.test", password: "OutraSenha123!" },
    });
    assert.equal(changed.status, 201);
    assert.equal(account.role, "FUNCIONARIO");
    assert.equal(account.professionalId, 1);
    assert.equal(verifyPassword("OutraSenha123!", account.passwordHash), true);
    assert.deepEqual(sessions, [{ userId: 999 }]);
    assert.equal(locks.length, 3);
    const inactive = await app.request("/api/v1/professionals/1", {
      method: "PUT",
      body: { ...body, active: false },
    });
    assert.equal(inactive.status, 200);
    assert.equal(((await inactive.json()) as any).active, false);
    assert.equal(account.email, "nova@example.test");
    assert.equal(
      (
        await app.request("/api/v1/professionals", {
          method: "POST",
          body: { ...body, name: "x".repeat(121) },
        })
      ).status,
      400,
    );
    assert.equal((await app.request("/api/v1/professionals/99")).status, 404);
  } finally {
    await app.close();
  }
});
