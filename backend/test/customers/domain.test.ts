import assert from "node:assert/strict";
import { test } from "node:test";
import { Customer } from "../../src/customers/domain/customer";
import { BirthDate } from "../../src/customers/domain/birth-date";
import { CustomerNote } from "../../src/customers/domain/customer-note";
const data = {
  name: "Cliente",
  phone: "(11) 99999-0000",
  email: null,
  birthDate: "1995-04-20",
  acquisitionSource: "OUTRO" as const,
};
test("nascimento é data civil e preserva o dia em DATE UTC e diferentes fusos", () => {
  const old = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Sao_Paulo", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      const date = BirthDate.from("1995-04-20");
      assert.equal(date.toStorage().toISOString(), "1995-04-20T00:00:00.000Z");
      assert.equal(
        BirthDate.fromStorage(date.toStorage()).toString(),
        "1995-04-20",
      );
    }
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
  assert.throws(() => BirthDate.from("2026-02-30"));
  assert.equal(BirthDate.from("2024-02-29").toString(), "2024-02-29");
});
test("cliente protege perfil, aceita ausência de dados opcionais e rejeita valores fora do banco", () => {
  const customer = Customer.create(data),
    before = customer.snapshot();
  before.name = "Mutação";
  assert.equal(customer.snapshot().name, "Cliente");
  for (const invalid of [
    { ...data, name: "x".repeat(121) },
    { ...data, email: "inválido" },
    { ...data, birthDate: "2026-02-30" },
  ])
    assert.throws(() => customer.updateProfile(invalid));
  assert.equal(customer.snapshot().name, "Cliente");
  assert.equal(customer.snapshot().email, null);
  assert.throws(() => customer.addNote("Título", "Texto", "Autor"));
});
test("nota pertence à cliente e revisão preserva autoria e identidade", () => {
  const customer = Customer.restore({ id: 1, ...data });
  const note = customer.addNote(" Título ", " Conteúdo ", "Profissional");
  assert.deepEqual(note.snapshot(), {
    id: null,
    customerId: 1,
    title: "Título",
    content: "Conteúdo",
    author: "Profissional",
  });
  const persisted = CustomerNote.restore({ ...note.snapshot(), id: 3 });
  persisted.revise("Novo título", "Novo conteúdo");
  assert.equal(persisted.snapshot().author, "Profissional");
  assert.equal(persisted.customerId, 1);
  assert.equal(persisted.id, 3);
  assert.throws(() => persisted.revise("", "Texto"));
  assert.equal(persisted.snapshot().title, "Novo título");
});
