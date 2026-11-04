import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { EquipmentController } from "../../src/equipments/presentation/equipment.controller";
import { ApiExceptionFilter } from "../../src/shared/presentation/api-exception.filter";
import { AuthConfiguration } from "../../src/auth/presentation/auth.configuration";
import { EquipmentError } from "../../src/equipments/domain/equipment-error";
import {
  componentInput,
  equipmentInput,
} from "../../src/equipments/presentation/equipment.schemas";
import { SessionGuard } from "../../src/auth/auth.guard";

test("escritas continuam exclusivas de ADMIN e consultas não são públicas", () => {
  for (const method of [
    "create",
    "update",
    "component",
    "updateComponent",
    "status",
    "componentStatus",
    "schedule",
    "maintenance",
    "compatibility",
  ])
    assert.equal(
      Reflect.getMetadata(
        "adminOnly",
        (EquipmentController.prototype as any)[method],
      ),
      true,
      method,
    );
  assert.equal(
    Reflect.getMetadata("isPublic", EquipmentController.prototype.list),
    undefined,
  );
});
test("fronteira HTTP rejeita transferência e contadores editáveis", () => {
  assert.equal(
    componentInput.safeParse({ name: "Cartucho", equipmentId: 2 }).success,
    false,
  );
  assert.equal(
    equipmentInput.safeParse({ name: "Aparelho", totalShots: 0 }).success,
    false,
  );
  assert.equal(
    componentInput.parse({ name: "Cartucho" }).nominalCapacity,
    undefined,
  );
});
test("erros de domínio preservam contrato HTTP sem importar Nest no domínio", () => {
  for (const [kind, expected] of [
    ["INVALID", 400],
    ["CONFLICT", 409],
    ["NOT_FOUND", 404],
  ] as const) {
    let status: number | undefined, body: unknown;
    const response = {
      status: (value: number) => {
        status = value;
        return response;
      },
      json: (value: unknown) => {
        body = value;
      },
    };
    new ApiExceptionFilter().catch(new EquipmentError("Mensagem", kind), {
      switchToHttp: () => ({ getResponse: () => response }),
    } as any);
    assert.equal(status, expected);
    assert.deepEqual(body, { error: "Mensagem", statusCode: expected });
  }
});
test("guard rejeita funcionário antes de executar escrita administrativa", async () => {
  const token = "a".repeat(64);
  const guard = new SessionGuard(
    {
      authenticate: async () => ({
        id: 1,
        name: "Equipe",
        role: "FUNCIONARIO",
        professionalId: 1,
      }),
    } as any,
    { getAllAndOverride: (key: string) => key === "adminOnly" } as any,
    AuthConfiguration.fromEnvironment({ NODE_ENV: "test" }),
  );
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { cookie: `clinic_session=${token}` },
        method: "POST",
      }),
    }),
    getHandler: () => EquipmentController.prototype.create,
    getClass: () => EquipmentController,
  };
  await assert.rejects(guard.canActivate(context as any), /Acesso restrito/);
});
