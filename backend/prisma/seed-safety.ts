export function assertDemoSeedAllowed(
  args: readonly string[],
  environment: string | undefined,
): void {
  if (environment === "production")
    throw new Error("Seed de demonstração proibido em produção.");
  if (!args.includes("--confirm-demo"))
    throw new Error(
      "Este seed cria dados fictícios e redefine credenciais demo/admin. Use somente banco isolado: npm run db:seed:demo -- --confirm-demo",
    );
}
