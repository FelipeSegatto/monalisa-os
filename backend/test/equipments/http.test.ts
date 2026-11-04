import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma.service";
import { hashToken } from "../../src/auth/security";
import { EquipmentRepository } from "../../src/equipments/domain/equipment.repository";
import { EquipmentQueries } from "../../src/equipments/application/equipment.queries";
import { Equipment } from "../../src/equipments/domain/equipment";
import { EquipmentError } from "../../src/equipments/domain/equipment-error";

test("rotas reais preservam sessão, ADMIN, autoria e erros 400/404/409 com persistência simulada", async () => {
  const init = PrismaService.prototype.onModuleInit,
    destroy = PrismaService.prototype.onModuleDestroy;
  PrismaService.prototype.onModuleInit = async function () {};
  PrismaService.prototype.onModuleDestroy = async function () {};
  try {
    const app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    try {
      const equipment = Equipment.restore({
        ...Equipment.create("EQ-001", {
          name: "Aparelho",
          shotTracking: "NONE",
          maintenanceIntervalMonths: 12,
        }).snapshot(),
        id: 1,
      });
      const adminToken = "a".repeat(64),
        staffToken = "b".repeat(64);
      let actor: number | undefined;
      const db = app.get(PrismaService);
      db.session.findUnique = async ({ where }: any) =>
        ({
          expiresAt: new Date(Date.now() + 60000),
          user: {
            id: where.tokenHash === hashToken(adminToken) ? 7 : 8,
            name: "Pessoa de teste",
            role:
              where.tokenHash === hashToken(adminToken)
                ? "ADMIN"
                : "FUNCIONARIO",
            professionalId: null,
          },
        }) as any;
      const repository = app.get(EquipmentRepository);
      repository.updateLocked = async (id, userId, change) => {
        if (id !== 1)
          throw new EquipmentError("Registro não encontrado", "NOT_FOUND");
        actor = userId;
        change(equipment);
      };
      const queries = app.get(EquipmentQueries);
      queries.list = async () => ({ equipment: [] });
      queries.detail = async () => ({
        ...equipment.snapshot(),
        id: 1,
        components: [],
        maintenanceState: "UNKNOWN",
        createdAt: new Date(),
        updatedAt: new Date(),
        procedures: [],
        events: [],
      });
      await app.listen(0, "127.0.0.1");
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      const call = (path: string, body?: object, token = adminToken) =>
        fetch(`${base}${path}`, {
          method: body ? "PATCH" : "GET",
          headers: {
            ...(token ? { cookie: `clinic_session=${token}` } : {}),
            ...(body ? { "content-type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      assert.equal((await call("/equipment", undefined, "")).status, 401);
      assert.equal(
        (await call("/equipment", undefined, staffToken)).status,
        200,
      );
      assert.equal(
        (
          await call(
            "/equipment/1/status",
            { status: "MAINTENANCE", reason: "Revisão" },
            staffToken,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call("/equipment/1/status", {
            status: "MAINTENANCE",
            reason: "Revisão",
            actorId: 99,
          })
        ).status,
        400,
      );
      const missing = await call("/equipment/99/status", {
        status: "MAINTENANCE",
        reason: "Revisão",
      });
      assert.equal(missing.status, 404);
      assert.deepEqual(await missing.json(), {
        error: "Registro não encontrado",
        statusCode: 404,
      });
      const accepted = await call("/equipment/1/status", {
        status: "MAINTENANCE",
        reason: "Revisão anual",
      });
      assert.equal(accepted.status, 200);
      assert.equal(((await accepted.json()) as any).status, "MAINTENANCE");
      assert.equal(actor, 7);
      const repeated = await call("/equipment/1/status", {
        status: "MAINTENANCE",
        reason: "Repetida",
      });
      assert.equal(repeated.status, 409);
      assert.equal(((await repeated.json()) as any).statusCode, 409);
      assert.equal(
        (
          await call("/equipment/1/status", {
            status: "RETIRED",
            reason: "Fim de uso",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call("/equipment/1/status", {
            status: "ACTIVE",
            reason: "Reativar",
          })
        ).status,
        409,
      );
    } finally {
      await app.close();
    }
  } finally {
    PrismaService.prototype.onModuleInit = init;
    PrismaService.prototype.onModuleDestroy = destroy;
  }
});
