import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { bootstrapAdmin } from "./bootstrap-admin";
async function main() {
  const db = new PrismaClient();
  try {
    await bootstrapAdmin(db, {
      email: process.env.ADMIN_EMAIL || "",
      name: process.env.ADMIN_NAME || "Administrador",
      password: process.env.ADMIN_PASSWORD || "",
    });
    console.log(
      "Administrador disponível. Contas existentes, senhas e dados operacionais preservados.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Não foi possível preparar o administrador. Confira ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD (12–200 caracteres), conexão e migrations; conta existente não administrativa não será promovida.",
  );
  process.exitCode = 1;
});
