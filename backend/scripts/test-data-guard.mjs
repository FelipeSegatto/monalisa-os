export function assertTestDataAllowed(args, url, environment) {
  if (
    environment === "production" ||
    !args.includes("--confirm-test-data") ||
    !url
  ) {
    throw new Error(
      "E2E grava dados. Defina TEST_URL de uma API com banco isolado e execute npm run test:e2e -- --confirm-test-data. Proibido em produção.",
    );
  }
  const parsed = new URL(url);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("E2E exige API local isolada, sem credenciais na URL.");
  }
}
