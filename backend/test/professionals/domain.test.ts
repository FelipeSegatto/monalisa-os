import assert from "node:assert/strict";
import { test } from "node:test";
import { Professional } from "../../src/professionals/domain/professional";
import { EmployeeCredentials } from "../../src/auth/domain/employee-credentials";
const data = {
  name: "Profissional",
  phone: null,
  email: null,
  color: null,
  active: true,
};
test("profissional valida limites do schema, usa cor padrão e encapsula ativação", () => {
  const professional = Professional.create(data);
  assert.equal(professional.snapshot().color, "#0d9488");
  professional.deactivate();
  assert.equal(professional.snapshot().active, false);
  professional.activate();
  assert.equal(professional.snapshot().active, true);
  const snapshot = professional.snapshot();
  snapshot.name = "Mutado";
  assert.equal(professional.snapshot().name, "Profissional");
  assert.throws(() =>
    professional.updateProfile({ ...data, name: "x".repeat(121) }),
  );
  assert.throws(() =>
    professional.updateProfile({ ...data, phone: "1".repeat(31) }),
  );
  assert.equal(professional.snapshot().name, "Profissional");
});
test("credenciais normalizam email da conta e não serializam a senha", () => {
  const credentials = EmployeeCredentials.from(
    "EQUIPE@example.test",
    "SenhaDeTeste123",
  );
  assert.equal(credentials.email, "equipe@example.test");
  assert.equal(credentials.revealPassword(), "SenhaDeTeste123");
  assert.equal(JSON.stringify(credentials).includes("SenhaDeTeste123"), false);
  assert.throws(() => EmployeeCredentials.from("equipe@example.test", "curta"));
  assert.throws(() => EmployeeCredentials.from("inválido", "SenhaDeTeste123"));
});
