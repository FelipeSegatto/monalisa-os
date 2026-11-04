import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { equipmentManifest, importEquipment } from "./equipment-seed-data";
async function main() {
  const path = process.argv[2];
  if (!path || !process.argv.includes("--confirm"))
    throw new Error(
      "Revise o arquivo e execute: npm run db:seed:equipment -- arquivo.json --confirm",
    );
  const data = equipmentManifest.parse(
    JSON.parse(await readFile(path, "utf8")),
  );
  const codes = data.equipment.flatMap((e) => [
    e.code,
    ...e.components.map((c) => c.code),
  ]);
  if (new Set(codes).size !== codes.length)
    throw new Error("Códigos duplicados no arquivo");
  const db = new PrismaClient();
  try {
    const actor = await db.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL || "" },
    });
    if (!actor || actor.role !== "ADMIN")
      throw new Error(
        "ADMIN_EMAIL precisa identificar um administrador existente",
      );
    await db.$transaction(
      async (tx) => {
        await importEquipment(tx, actor.id, data);
      },
      { timeout: 20000 },
    );
    console.log(
      "Cadastros importados. Registros existentes, datas e históricos preservados.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
