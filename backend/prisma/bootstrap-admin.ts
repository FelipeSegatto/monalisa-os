import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword } from "../src/auth/security";
const input = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(12).max(200),
  })
  .strict();

/** Explicit initial account creation, never password reset or demo import. */
export async function bootstrapAdmin(
  db: Pick<PrismaClient, "user">,
  values: z.input<typeof input>,
): Promise<void> {
  const data = input.parse(values);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    if (existing.role !== "ADMIN")
      throw new Error(
        "O email informado pertence a uma conta não administrativa; nenhuma alteração realizada.",
      );
    return;
  }
  const user = await db.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      name: data.name,
      passwordHash: hashPassword(data.password),
      role: "ADMIN",
    },
  });
  if (user.role !== "ADMIN")
    throw new Error(
      "O email foi ocupado por outra conta; nenhuma permissão foi alterada.",
    );
}
