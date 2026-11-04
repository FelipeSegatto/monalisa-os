import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma.service";
import { EquipmentService } from "../../src/equipments/application/equipment.service";
import { EquipmentRepository } from "../../src/equipments/domain/equipment.repository";
import { EquipmentQueries } from "../../src/equipments/application/equipment.queries";

test("módulo resolve providers reais e compartilha uma instância de Prisma com os domínios antigos", async () => {
  // DI test only: skip DB lifecycle; no claim of actual MySQL integration.
  const init = PrismaService.prototype.onModuleInit,
    destroy = PrismaService.prototype.onModuleDestroy;
  PrismaService.prototype.onModuleInit = async function () {};
  PrismaService.prototype.onModuleDestroy = async function () {};
  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
      abortOnError: false,
    });
    try {
      assert.ok(app.get(EquipmentService));
      const db = app.get(PrismaService);
      assert.equal(
        (app.get(EquipmentRepository) as unknown as { db: PrismaService }).db,
        db,
      );
      assert.equal(
        (app.get(EquipmentQueries) as unknown as { db: PrismaService }).db,
        db,
      );
    } finally {
      await app.close();
    }
  } finally {
    PrismaService.prototype.onModuleInit = init;
    PrismaService.prototype.onModuleDestroy = destroy;
  }
});
test("domínio permanece independente de HTTP, ORM, validação externa e camadas superiores", () => {
  const dir = join(__dirname, "../../src/equipments/domain");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".ts"))) {
    const source = readFileSync(join(dir, file), "utf8");
    assert.doesNotMatch(
      source,
      /from\s+['"](?:@nestjs|@prisma|zod|express|.*\/(?:infrastructure|application|presentation)\/)/,
      file,
    );
  }
});
