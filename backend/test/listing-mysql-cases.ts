import "reflect-metadata";
import { PrismaCommercialSales } from "../src/commercial/infrastructure/prisma-commercial-sales";
import { PrismaExpenseQueries } from "../src/expenses/infrastructure/prisma-expense.queries";
const admin = {
  id: 7,
  role: "ADMIN",
  name: "Synthetic",
  professionalId: null,
} as const;
async function main() {
  let query: any;
  const db: any = {
    $queryRaw: async (input: any) => {
      query = input;
      return [];
    },
  };
  const sales = new PrismaCommercialSales(db, {} as any, {} as any);
  const expenses = new PrismaExpenseQueries(db);
  const cases: any[] = [];
  async function record(
    name: string,
    expected: number[],
    work: () => Promise<any>,
  ) {
    await work();
    cases.push({
      name,
      expected,
      sql: query.sql,
      values: query.values.map((value: unknown) =>
        value instanceof Date ? { date: value.toISOString() } : value,
      ),
    });
  }
  await record(
    "paid sales include free sale and exclude reversed payments",
    [6, 2],
    () => sales.list(admin, undefined, undefined, { status: "PAID" }),
  );
  await record("pending sales include reversed receipt", [7, 5, 1], () =>
    sales.list(admin, undefined, undefined, { status: "PENDING" }),
  );
  await record("partial sales", [3], () =>
    sales.list(admin, undefined, undefined, { status: "PARTIAL" }),
  );
  await record("cancelled sales", [4], () =>
    sales.list(admin, undefined, undefined, { status: "CANCELLED" }),
  );
  await record("category and inclusive Sao Paulo day", [6, 5, 4, 3, 2, 1], () =>
    sales.list(admin, undefined, undefined, {
      categoryId: 1,
      start: "2026-11-01",
      end: "2026-11-01",
    }),
  );
  await record("literal wildcard search", [6, 5, 4, 3, 2, 1], () =>
    sales.list(admin, undefined, undefined, { search: "%" }),
  );
  await record("employee remains scoped", [3, 2, 1], () =>
    sales.list(
      { ...admin, role: "FUNCIONARIO", professionalId: 1 },
      undefined,
      undefined,
      { categoryId: 1 },
    ),
  );
  await record("sales cursor after filters", [3, 2, 1], () =>
    sales.list(admin, undefined, 4, { categoryId: 1 }),
  );
  await record("expense category and pending", [1], () =>
    expenses.list({ category: "INSUMOS", status: "PENDING" }, admin),
  );
  await record("expense dates are inclusive civil dates", [3, 2, 1], () =>
    expenses.list({ dueStart: "2026-11-01", dueEnd: "2026-11-01" }, admin),
  );
  await record("destination uses current revision", [2], () =>
    expenses.list({ destination: "GENERAL" }, admin),
  );
  await record("procedure uses current revision", [1], () =>
    expenses.list({ procedureId: 1 }, admin),
  );
  await record("expense cancelled is exclusive", [3], () =>
    expenses.list({ status: "CANCELLED" }, admin),
  );
  await record("paid expenses exclude cancelled", [2], () =>
    expenses.list({ status: "PAID" }, admin),
  );
  console.log(JSON.stringify(cases));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
