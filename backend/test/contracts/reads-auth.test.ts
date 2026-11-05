import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";
import { hashPassword } from "../../src/auth/security";

test("controllers legados resolvem Prisma e preservam contratos de clientes, dashboard, leads e anexos", async () => {
  const app = await contractApp();
  try {
    app.db.customer.findMany = async () => [
      {
        id: 1,
        name: "Cliente fictícia",
        phone: "11999990000",
        email: null,
        birthDate: null,
        acquisitionSource: "OUTRO",
        createdAt: new Date("2030-01-01T12:00:00Z"),
        appointments: [],
      },
    ];
    app.db.professional.findMany = async () => [];
    app.db.professional.findFirst = async () => null;
    app.db.procedure.findFirst = async () => ({
      id: 1,
      active: true,
      durationMinutes: 30,
    });
    app.db.procedure.findUnique = app.db.procedure.findFirst;
    app.db.schedulingSettings.findUnique = async () => null;
    app.db.appointment.findMany = async () => [];
    app.db.agendaBlock.findMany = async () => [];
    app.db.stockItem.findMany = async () => [];
    app.db.sale.findMany = async () => [];
    app.db.expense.findMany = async () => [];
    app.db.lead.findMany = async () => [];
    app.db.customerDocument.findMany = async () => [];
    app.db.customerPhoto.findMany = async () => [];
    await app.start();
    const customers = await app.request("/api/v1/customers");
    assert.equal(customers.status, 200);
    const payload: any = await customers.json();
    assert.equal(payload.customers[0].name, "Cliente fictícia");
    assert.equal(payload.customers[0].birthDate, null);
    assert.equal(payload.customers[0].lastAppointmentAt, null);
    const dashboard = await app.request("/api/v1/dashboard");
    assert.equal(dashboard.status, 200);
    const overview: any = await dashboard.json();
    assert.equal(overview.today.totalAppointments, 0);
    assert.equal(overview.finance.sales, 0);
    assert.ok(Array.isArray(overview.appointments));
    for (const [path, key] of [
      ["/api/v1/leads", "leads"],
      ["/api/v1/customers/1/documents", "documents"],
      ["/api/v1/customers/1/photos", "photos"],
    ]) {
      const response = await app.request(path);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { [key]: [] });
    }
    const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const slots = await app.request(
      `/api/v1/public/booking/slots?date=${day}`,
      { role: "ANONYMOUS" },
    );
    assert.equal(slots.status, 200);
    assert.deepEqual(await slots.json(), { date: day, slots: [] });
  } finally {
    await app.close();
  }
});

test("login e logout usam as dependências reais e mantêm cookie HttpOnly e hash de sessão", async () => {
  const app = await contractApp();
  try {
    const password = "SenhaFicticiaSomenteTeste123!";
    let saved: any;
    let deletions = 0;
    const storedHash = hashPassword(password);
    app.db.user.findUnique = async () => ({
      id: 7,
      name: "Administrador de teste",
      email: "admin@example.test",
      passwordHash: storedHash,
      role: "ADMIN",
      professionalId: null,
    });
    app.db.session.create = async ({ data }: any) => {
      saved = data;
      return data;
    };
    app.db.session.deleteMany = async () => {
      deletions++;
      return { count: 1 };
    };
    app.db.$transaction = async (work: any) =>
      work({
        ...app.db,
        $queryRaw: async () => [{ id: 7, passwordHash: storedHash }],
      });
    await app.start();
    const login = await app.request("/api/v1/auth/login", {
      method: "POST",
      role: "ANONYMOUS",
      body: { email: "admin@example.test", password },
    });
    assert.equal(login.status, 200);
    assert.deepEqual(await login.json(), {
      id: 7,
      name: "Administrador de teste",
      email: "admin@example.test",
    });
    const cookie = login.headers.get("set-cookie") || "";
    assert.match(cookie, /clinic_session=[a-f0-9]{64}/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    const raw = /clinic_session=([a-f0-9]+)/.exec(cookie)![1];
    assert.equal(saved.userId, 7);
    assert.match(saved.tokenHash, /^[a-f0-9]{64}$/);
    assert.notEqual(saved.tokenHash, raw);
    const logout = await app.request("/api/v1/auth/logout", { method: "POST" });
    assert.equal(logout.status, 200);
    assert.deepEqual(await logout.json(), { ok: true });
    assert.equal(deletions, 1);
  } finally {
    await app.close();
  }
});
