import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hashPassword,
  verifyPassword,
  ScryptPasswordHasher,
} from "../../src/auth/infrastructure/scrypt-password-hasher";
import { CryptoSessionTokens } from "../../src/auth/infrastructure/crypto-session-tokens";
import { AuthConfiguration } from "../../src/auth/presentation/auth.configuration";
import { RuntimeConfiguration } from "../../src/configuration/runtime-configuration";
import { SessionCookie } from "../../src/auth/presentation/session-cookie";
test("scrypt assíncrono é compatível com hashes existentes, salts distintos e hashes inválidos", async () => {
  const password = "SomenteTeste123!";
  const a = hashPassword(password),
    b = hashPassword(password);
  assert.notEqual(a, b);
  assert.equal(verifyPassword(password, a), true);
  const hasher = new ScryptPasswordHasher();
  assert.equal(await hasher.verify(password, a), true);
  assert.equal(await hasher.verify("errada", a), false);
  assert.equal(await hasher.verify(password, null), false);
  assert.equal(await hasher.verify(password, "corrompido"), false);
  const tokens = new CryptoSessionTokens(),
    token = tokens.generate();
  assert.match(token.reveal(), /^[a-f0-9]{64}$/);
  assert.match(tokens.hash(token), /^[a-f0-9]{64}$/);
  assert.notEqual(tokens.hash(token), token.reveal());
});
test("configuração valida origens e cookies sem inventar política por recurso", () => {
  const local = AuthConfiguration.fromEnvironment({ NODE_ENV: "test" });
  assert.equal(local.secureCookie, false);
  assert.doesNotThrow(() =>
    local.assertOrigin("POST", "http://localhost:5199"),
  );
  assert.doesNotThrow(() => local.assertOrigin("POST", ""));
  assert.throws(() => local.assertOrigin("POST", "https://outro.example"));
  assert.throws(() =>
    AuthConfiguration.fromEnvironment({
      NODE_ENV: "production",
      COOKIE_SECURE: "false",
      CORS_ORIGIN: "https://clinica.example",
    }),
  );
  assert.throws(() =>
    AuthConfiguration.fromEnvironment({
      NODE_ENV: "production",
      COOKIE_SECURE: "true",
      CORS_ORIGIN: "http://clinica.example",
    }),
  );
  assert.throws(() =>
    AuthConfiguration.fromEnvironment({ COOKIE_SECURE: "yes" }),
  );
  assert.throws(() => AuthConfiguration.fromEnvironment({ CORS_ORIGIN: "*" }));
  const prod = AuthConfiguration.fromEnvironment({
    NODE_ENV: "production",
    COOKIE_SECURE: "true",
    CORS_ORIGIN: "https://clinica.example",
  });
  assert.deepEqual(SessionCookie.options(prod.secureCookie), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400000,
  });
  assert.equal("maxAge" in SessionCookie.clearOptions(true), false);
});
test("entrada executável exige URL MySQL e porta válida sem exibir valores secretos", () => {
  assert.throws(
    () =>
      RuntimeConfiguration.fromEnvironment({
        DATABASE_URL: "senha-super-secreta",
      }),
    (error) =>
      error instanceof Error && !error.message.includes("senha-super-secreta"),
  );
  assert.throws(() =>
    RuntimeConfiguration.fromEnvironment({
      DATABASE_URL: "mysql://unused:unused@localhost/dev",
      PORT: "0",
    }),
  );
  assert.equal(
    RuntimeConfiguration.fromEnvironment({
      DATABASE_URL: "mysql://unused:unused@localhost/dev",
    }).port,
    3333,
  );
});
