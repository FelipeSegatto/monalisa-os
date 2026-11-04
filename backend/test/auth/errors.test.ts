import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiExceptionFilter } from "../../src/shared/presentation/api-exception.filter";
import { AuthError } from "../../src/auth/domain/auth-error";
import { EquipmentError } from "../../src/equipments/domain/equipment-error";
function format(error: unknown) {
  let status = 0,
    body: any;
  const logs: string[] = [];
  const filter = new ApiExceptionFilter();
  (filter as any).logger.error = (value: string) => logs.push(value);
  const response = {
    status: (value: number) => {
      status = value;
      return response;
    },
    json: (value: unknown) => {
      body = value;
    },
  };
  filter.catch(error, {
    switchToHttp: () => ({ getResponse: () => response }),
  } as any);
  return { status, body, logs };
}
test("filtro central traduz domínio sem alterar contrato de autenticação ou equipamentos", () => {
  assert.deepEqual(
    format(new AuthError("MISSING_SESSION", "Faça login")).body,
    { error: "Faça login", statusCode: 401 },
  );
  assert.equal(format(new AuthError("FORBIDDEN", "Sem acesso")).status, 403);
  assert.equal(
    format(new AuthError("RATE_LIMITED", "Muitas tentativas")).status,
    401,
  );
  assert.deepEqual(format(new EquipmentError("Conflito", "CONFLICT")).body, {
    error: "Conflito",
    statusCode: 409,
  });
});
test("validação tem detalhes úteis e erros Prisma não revelam consultas ou valores", () => {
  const validation = format(
    new BadRequestException({
      fieldErrors: { name: ["Nome obrigatório"] },
      formErrors: [],
    }),
  );
  assert.deepEqual(validation.body, {
    error: "Dados inválidos",
    statusCode: 400,
    details: { fieldErrors: { name: ["Nome obrigatório"] }, formErrors: [] },
  });
  for (const [code, status] of [
    ["P2000", 400],
    ["P2002", 409],
    ["P2003", 409],
    ["P2025", 404],
    ["P2024", 503],
    ["P2034", 409],
  ]) {
    const result = format(
      new Prisma.PrismaClientKnownRequestError("SQL senha-secreta", {
        code,
        clientVersion: "6.19.0",
      }),
    );
    assert.equal(result.status, status);
    assert.equal(JSON.stringify(result).includes("senha-secreta"), false);
  }
});
test("falhas internas não expõem mensagem nem nome de erro manipulável", () => {
  const error = new Error("cookie=sessao-secreta");
  error.name = "senha-secreta";
  const result = format(error);
  assert.deepEqual(result.body, { error: "Erro interno", statusCode: 500 });
  assert.equal(JSON.stringify(result).includes("secreta"), false);
  assert.equal(result.logs.length, 1);
});
