import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthService } from "../../src/auth/application/auth.service";
import {
  SessionService,
  SESSION_LIFETIME_MS,
} from "../../src/auth/application/session.service";
import { AuthUser } from "../../src/auth/domain/auth-user";
import { AuthSession } from "../../src/auth/domain/auth-session";
import { SessionToken } from "../../src/auth/domain/session-token";
import { MemoryLoginAttemptLimiter } from "../../src/auth/infrastructure/memory-login-attempt-limiter";
function fixture() {
  let now = 1000;
  let stored: any = null;
  let lookup = 0;
  const hashes: (string | null)[] = [];
  const actor = {
    id: 7,
    name: "Admin",
    role: "ADMIN" as const,
    professionalId: null,
  };
  const repository = {
    create: async (hash: string, userId: number, expiresAt: number) => {
      stored = { hash, userId, expiresAt };
    },
    findByHash: async (hash: string) => {
      lookup++;
      return stored && stored.hash === hash
        ? AuthSession.restore(actor, stored.expiresAt)
        : null;
    },
    deleteByHash: async () => {
      stored = null;
    },
  };
  const tokens = {
    generate: () => SessionToken.from("a".repeat(64)),
    hash: () => "b".repeat(64),
  };
  const clock = { now: () => now };
  const attempts = new MemoryLoginAttemptLimiter(clock);
  const sessions = new SessionService(repository, tokens, clock);
  const users = {
    findByEmail: async (email: string) =>
      email === "admin@example.test"
        ? AuthUser.restore({ ...actor, email, passwordHash: "hash" })
        : null,
  };
  const passwords = {
    verify: async (password: string, hash: string | null) => {
      hashes.push(hash);
      return hash === "hash" && password === "correta";
    },
  };
  return {
    auth: new AuthService(users, passwords, attempts, sessions),
    sessions,
    attempts,
    stored: () => stored,
    lookups: () => lookup,
    hashes,
    advance: (value: number) => {
      now = value;
    },
  };
}
test("login emite sessão com hash e sete dias; logout revoga e expiração é verificada", async () => {
  const f = fixture();
  const result = await f.auth.login("ADMIN@example.test", "correta", "ip");
  assert.equal(result.profile.id, 7);
  assert.deepEqual(f.stored(), {
    hash: "b".repeat(64),
    userId: 7,
    expiresAt: 1000 + SESSION_LIFETIME_MS,
  });
  assert.equal(
    (await f.sessions.authenticate(result.token.reveal())).role,
    "ADMIN",
  );
  f.advance(1000 + SESSION_LIFETIME_MS);
  await assert.rejects(
    f.sessions.authenticate(result.token.reveal()),
    /Sessão expirada/,
  );
  await f.sessions.revoke(result.token.reveal());
  await assert.rejects(
    f.sessions.authenticate(result.token.reveal()),
    /Sessão expirada/,
  );
});
test("formato de token inválido é rejeitado antes da consulta", async () => {
  const f = fixture();
  await assert.rejects(f.sessions.authenticate("inválido"));
  assert.equal(f.lookups(), 0);
});
test("senha incorreta e usuário ausente retornam o mesmo erro e não criam sessão", async () => {
  const f = fixture();
  for (const email of ["admin@example.test", "ausente@example.test"])
    await assert.rejects(
      f.auth.login(email, "errada", "ip"),
      /Email ou senha inválidos/,
    );
  assert.deepEqual(f.hashes, ["hash", null]);
  assert.equal(f.stored(), null);
});
test("limite de falhas expira e sucesso limpa a janela", async () => {
  const f = fixture();
  for (let i = 0; i < 10; i++)
    await assert.rejects(f.auth.login("ausente@example.test", "errada", "ip"));
  await assert.rejects(
    f.auth.login("admin@example.test", "correta", "ip"),
    /Muitas tentativas/,
  );
  f.advance(1000 + 15 * 60000);
  await f.auth.login("admin@example.test", "correta", "ip");
  for (let i = 0; i < 9; i++)
    await assert.rejects(f.auth.login("ausente@example.test", "errada", "ip"));
  await f.auth.login("admin@example.test", "correta", "ip");
  for (let i = 0; i < 9; i++)
    await assert.rejects(f.auth.login("ausente@example.test", "errada", "ip"));
  await assert.doesNotReject(
    f.auth.login("admin@example.test", "correta", "ip"),
  );
});
test("limitador local mantém memória limitada e remove janelas vencidas", () => {
  let now = 0;
  const limiter = new MemoryLoginAttemptLimiter({ now: () => now });
  for (let i = 0; i < 10001; i++) limiter.failed(String(i));
  assert.equal((limiter as any).windows.size, 10000);
  now = 16 * 60000;
  limiter.assertAllowed("limpeza");
  assert.equal((limiter as any).windows.size, 0);
});
