import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthUser } from "../../src/auth/domain/auth-user";
import { AuthSession } from "../../src/auth/domain/auth-session";
import { SessionToken } from "../../src/auth/domain/session-token";
import { AuthError } from "../../src/auth/domain/auth-error";
import { AuthorizationPolicy } from "../../src/auth/domain/authorization-policy";
import { LoginAttemptWindow } from "../../src/auth/domain/login-attempt-window";
const actor = {
  id: 1,
  name: "Profissional",
  role: "FUNCIONARIO" as const,
  professionalId: 2,
};
test("sessão expira na fronteira e não permite alterar identidade por referência", () => {
  const source = {
    ...actor,
    passwordHash: "não deve sair",
    email: "privado@example.test",
  };
  const session = AuthSession.restore(source, 1000);
  source.name = "Alterado";
  assert.deepEqual(session.authenticate(999), actor);
  const value = session.authenticate(999);
  value.role = "ADMIN";
  assert.equal(session.authenticate(999).role, "FUNCIONARIO");
  assert.throws(
    () => session.authenticate(1000),
    (error) => error instanceof AuthError && error.kind === "EXPIRED_SESSION",
  );
});
test("token opaco rejeita formatos inválidos e não revela credencial em JSON ou string", () => {
  for (const value of [undefined, "", "x".repeat(64), "a".repeat(63)])
    assert.throws(() => SessionToken.from(value), AuthError);
  const raw = "a".repeat(64),
    token = SessionToken.from(raw);
  assert.equal(token.reveal(), raw);
  assert.equal(String(token), "[redacted]");
  assert.equal(JSON.stringify(token), '"[redacted]"');
  assert.deepEqual(Object.keys(token), []);
});
test("usuário produz somente perfil público e ator sem credenciais", () => {
  const user = AuthUser.restore({
    ...actor,
    email: "equipe@example.test",
    passwordHash: "segredo",
  });
  assert.deepEqual(user.publicProfile(), {
    id: 1,
    name: "Profissional",
    email: "equipe@example.test",
  });
  assert.equal(JSON.stringify(user).includes("segredo"), false);
  assert.deepEqual(user.toActor(), actor);
  assert.throws(
    () => AuthorizationPolicy.requireAdministrator(actor),
    AuthError,
  );
  assert.doesNotThrow(() =>
    AuthorizationPolicy.requireAdministrator({ ...actor, role: "ADMIN" }),
  );
});
test("janela bloqueia após dez falhas e vence no prazo exato", () => {
  const window = new LoginAttemptWindow(1000);
  for (let i = 0; i < 10; i++) {
    window.assertAllowed(999);
    window.fail();
  }
  assert.throws(
    () => window.assertAllowed(999),
    (error) => error instanceof AuthError && error.kind === "RATE_LIMITED",
  );
  assert.doesNotThrow(() => window.assertAllowed(1000));
  assert.equal(window.isExpired(1000), true);
});
