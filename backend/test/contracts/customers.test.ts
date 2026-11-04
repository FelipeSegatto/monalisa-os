import assert from "node:assert/strict";
import { test } from "node:test";
import { contractApp } from "./app-harness";
test("clientes mantêm cadastro, nascimento, histórico e notas com autoria da sessão", async () => {
  const app = await contractApp();
  try {
    let customer: any = null;
    let notes: any[] = [];
    app.db.customer.create = async ({ data }: any) =>
      (customer = { id: 1, ...data, createdAt: new Date(), appointments: [] });
    app.db.customer.findUnique = async ({ where }: any) =>
      customer && where.id === customer.id ? customer : null;
    app.db.customer.findMany = async () => (customer ? [customer] : []);
    app.db.customer.update = async ({ data }: any) =>
      (customer = { ...customer, ...data });
    app.db.customerNote.create = async ({ data }: any) => {
      const note = { id: 1, ...data, createdAt: new Date() };
      notes.push(note);
      return note;
    };
    app.db.customerNote.findMany = async ({ where }: any) =>
      notes.filter((note) => note.customerId === where.customerId);
    app.db.customerNote.findFirst = async ({ where }: any) =>
      notes.find(
        (note) => note.id === where.id && note.customerId === where.customerId,
      ) || null;
    app.db.customerNote.updateMany = async ({ where, data }: any) => {
      const note = notes.find(
        (note) => note.id === where.id && note.customerId === where.customerId,
      );
      if (!note) return { count: 0 };
      Object.assign(note, data);
      return { count: 1 };
    };
    app.db.customerNote.deleteMany = async ({ where }: any) => {
      const before = notes.length;
      notes = notes.filter(
        (note) => note.id !== where.id || note.customerId !== where.customerId,
      );
      return { count: before - notes.length };
    };
    await app.start();
    const body = {
      name: "Cliente fictícia",
      phone: "11999990000",
      email: null,
      birthDate: "1995-04-20",
      acquisitionSource: "OUTRO",
    };
    const created = await app.request("/api/v1/customers", {
      method: "POST",
      role: "FUNCIONARIO",
      body,
    });
    assert.equal(created.status, 201);
    assert.equal(((await created.json()) as any).birthDate, "1995-04-20");
    assert.equal(customer.birthDate.toISOString(), "1995-04-20T00:00:00.000Z");
    const list: any = await (
      await app.request("/api/v1/customers?source=OUTRO")
    ).json();
    assert.equal(list.customers[0].birthDate, "1995-04-20");
    assert.equal(list.customers[0].acquisitionSourceLabel, "Outro");
    const start = new Date(Date.now() + 86400000);
    customer.appointments = [
      {
        id: 5,
        startsAt: start,
        endsAt: new Date(+start + 1800000),
        status: "SCHEDULED",
        procedure: { name: "Tratamento" },
        professional: { name: "Profissional" },
      },
    ];
    const detail: any = await (await app.request("/api/v1/customers/1")).json();
    assert.equal(detail.nextAppointment.id, 5);
    assert.equal(detail.history[0].procedureName, "Tratamento");
    const updated = await app.request("/api/v1/customers/1", {
      method: "PUT",
      body: { ...body, name: "Nome atualizado" },
    });
    assert.equal(updated.status, 200);
    assert.equal(((await updated.json()) as any).birthDate, "1995-04-20");
    const note = await app.request("/api/v1/customers/1/notes", {
      method: "POST",
      body: { title: "Nota", content: "Conteúdo", author: "Forjado" },
    });
    assert.equal(note.status, 201);
    assert.equal(
      ((await note.json()) as any).notes[0].author,
      "Pessoa de teste",
    );
    assert.equal(
      (
        await app.request("/api/v1/customers/2/notes/1", {
          method: "PUT",
          body: { title: "Outro", content: "Texto" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await app.request("/api/v1/customers/1/notes/1", {
          method: "PUT",
          body: { title: "Revisão", content: "Novo texto" },
        })
      ).status,
      200,
    );
    assert.equal(notes[0].author, "Pessoa de teste");
    await app.request("/api/v1/customers/2/notes/1", { method: "DELETE" });
    assert.equal(notes.length, 1);
    const removed = await app.request("/api/v1/customers/1/notes/1", {
      method: "DELETE",
    });
    assert.equal(removed.status, 200);
    assert.deepEqual(await removed.json(), { notes: [] });
    assert.equal(
      (
        await app.request("/api/v1/customers", {
          method: "POST",
          body: { ...body, birthDate: "2026-02-30" },
        })
      ).status,
      400,
    );
    assert.equal(
      (await app.request("/api/v1/customers?source=INVALID")).status,
      400,
    );
    assert.equal((await app.request("/api/v1/customers/99")).status, 404);
    assert.equal(
      (await app.request("/api/v1/customers", { role: "ANONYMOUS" })).status,
      401,
    );
  } finally {
    await app.close();
  }
});
