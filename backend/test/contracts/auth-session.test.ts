import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { contractApp } from "./app-harness";
import { hashPassword, hashToken } from "../../src/auth/security";

async function fixture() {
  const app = await contractApp();
  const password = "SenhaSomenteTeste123!";
  const users = [
    {
      id: 7,
      name: "Admin Teste",
      email: "admin@example.test",
      role: "ADMIN",
      professionalId: null,
      passwordHash: hashPassword(password),
    },
    {
      id: 8,
      name: "Equipe Teste",
      email: "equipe@example.test",
      role: "FUNCIONARIO",
      professionalId: 1,
      passwordHash: hashPassword(password),
    },
  ];
  const sessions = new Map<string, any>();
  let reads = 0;
  app.db.user.findUnique = async ({ where }: any) =>
    users.find((user) => user.email === where.email) || null;
  app.db.session.create = async ({ data }: any) => {
    sessions.set(data.tokenHash, { ...data });
    return data;
  };
  app.db.session.findUnique = async ({ where }: any) => {
    reads++;
    const session = sessions.get(where.tokenHash);
    return session
      ? { ...session, user: users.find((user) => user.id === session.userId) }
      : null;
  };
  app.db.session.deleteMany = async ({ where }: any) => ({
    count: sessions.delete(where.tokenHash) ? 1 : 0,
  });
  app.db.procedureCategory.findMany = async () => [];
  app.db.equipment.findMany = async () => [];
  app.db.customer.findMany = async () => [];
  app.db.lead.findMany = async () => [];
  app.db.stockItem.findMany = async () => [];
  app.db.$transaction = async (work: any) =>
    work({
      ...app.db,
      $queryRaw: async (_strings: TemplateStringsArray, id: number) =>
        users.filter((user) => user.id === id),
    });
  await app.start();
  const login = async (email: string, extra: object = {}) =>
    app.request("/api/v1/auth/login", {
      role: "ANONYMOUS",
      method: "POST",
      body: { email, password, ...extra },
    });
  return { ...app, password, sessions, reads: () => reads, login };
}
const cookie = (response: Response) =>
  response.headers.get("set-cookie")!.split(";")[0];

test("sessão real por cookie: login, me, tokens separados, logout e expiração sem acesso ao MySQL", async () => {
  const app = await fixture();
  try {
    assert.equal(
      (await app.request("/api/v1/me", { role: "ANONYMOUS" })).status,
      401,
    );
    const before = app.reads();
    assert.equal(
      (
        await app.request("/api/v1/me", {
          role: "ANONYMOUS",
          headers: { cookie: "clinic_session=inválida" },
        })
      ).status,
      401,
    );
    assert.equal(app.reads(), before);
    const login = await app.login("admin@example.test");
    assert.equal(login.status, 200);
    const first = cookie(login);
    assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
    assert.deepEqual(await login.json(), {
      id: 7,
      name: "Admin Teste",
      email: "admin@example.test",
    });
    const me = await app.request("/api/v1/me", { headers: { cookie: first } });
    assert.equal(me.status, 200);
    assert.deepEqual(await me.json(), {
      id: 7,
      name: "Admin Teste",
      role: "ADMIN",
      professionalId: null,
      firstName: "Admin",
      roleLabel: "Administrador",
    });
    const raw = first.split("=")[1];
    assert.ok(app.sessions.has(hashToken(raw)));
    assert.equal(app.sessions.has(raw), false);
    const other = await app.login("admin@example.test"),
      second = cookie(other);
    assert.notEqual(first, second);
    const logout = await app.request("/api/v1/auth/logout", {
      method: "POST",
      headers: { cookie: first },
    });
    assert.equal(logout.status, 200);
    assert.deepEqual(await logout.json(), { ok: true });
    assert.match(logout.headers.get("set-cookie")!, /Expires=/);
    assert.equal(
      (await app.request("/api/v1/me", { headers: { cookie: first } })).status,
      401,
    );
    assert.equal(
      (await app.request("/api/v1/me", { headers: { cookie: second } })).status,
      200,
    );
    app.sessions.get(hashToken(second.split("=")[1])).expiresAt = new Date(
      Date.now() - 1,
    );
    assert.equal(
      (await app.request("/api/v1/me", { headers: { cookie: second } })).status,
      401,
    );
  } finally {
    await app.close();
  }
});

test("papel vem do banco; matriz atual e proteção de origem são preservadas", async () => {
  const app = await fixture();
  try {
    const login = await app.login("equipe@example.test", {
      role: "ADMIN",
      professionalId: 99,
    });
    assert.equal(login.status, 200);
    const headers = { cookie: cookie(login) };
    const me: any = await (await app.request("/api/v1/me", { headers })).json();
    assert.equal(me.role, "FUNCIONARIO");
    assert.equal(me.professionalId, 1);
    for (const path of [
      "/api/v1/equipment",
      "/api/v1/customers",
      "/api/v1/leads",
      "/api/v1/stock/items",
    ])
      assert.equal((await app.request(path, { headers })).status, 200, path);
    for (const [method, path, body] of [
      ["POST", "/api/v1/equipment", {}],
      ["POST", "/api/v1/stock/items", {}],
      ["POST", "/api/v1/professionals", {}],
      ["PUT", "/api/v1/procedures/1/materials", []],
      ["POST", "/api/v1/finance/expenses", {}],
      ["POST", "/api/v1/finance/sales/1/cancel", {}],
    ] as const) {
      assert.equal(
        (await app.request(path, { method, body, headers })).status,
        403,
        path,
      );
    }
    assert.equal(
      (await app.request("/api/v1/public/catalog", { role: "ANONYMOUS" }))
        .status,
      200,
    );
    assert.equal(
      (
        await app.request("/api/v1/auth/login", {
          role: "ANONYMOUS",
          method: "POST",
          body: { email: "admin@example.test", password: app.password },
          headers: { origin: "https://origem-nao-autorizada.example" },
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});

test("erros globais preservam JSON, não revelam credenciais e distinguem validação de conflito", async () => {
  const app = await fixture();
  try {
    const unknown = await app.login("ausente@example.test");
    assert.equal(unknown.status, 401);
    const unknownBody = await unknown.json();
    const wrong = await app.login("admin@example.test", {
      password: "incorreta",
    });
    assert.equal(wrong.status, 401);
    assert.deepEqual(await wrong.json(), unknownBody);
    const admin = await app.login("admin@example.test");
    const headers = { cookie: cookie(admin) };
    const invalid = await app.request("/api/v1/equipment", {
      method: "POST",
      headers,
      body: { password: "nao-deve-ser-exibida" },
    });
    assert.equal(invalid.status, 400);
    const body: any = await invalid.json();
    assert.equal(body.error, "Dados inválidos");
    assert.ok(Array.isArray(body.details.fieldErrors.name));
    assert.equal(JSON.stringify(body).includes("nao-deve-ser-exibida"), false);
    app.db.equipment.findMany = async () => {
      throw new Prisma.PrismaClientKnownRequestError("SELECT senha-secreta", {
        code: "P2002",
        clientVersion: "6.19.0",
      });
    };
    const conflict = await app.request("/api/v1/equipment", { headers });
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), {
      error: "Já existe um registro com esses dados",
      statusCode: 409,
    });
  } finally {
    await app.close();
  }
});
