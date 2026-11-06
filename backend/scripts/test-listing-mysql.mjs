import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const name = `monalisa-listing-test-${process.pid}`;
const image =
  "mysql:8.4@sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902";
function docker(args, input) {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    timeout: 60000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}
function sql(query) {
  return docker(
    ["exec", "-i", name, "mysql", "-uroot", "-N", "clinic_test"],
    query,
  );
}
let created = false;
try {
  const captured = spawnSync(
    process.execPath,
    ["--import", "tsx", "test/listing-mysql-cases.ts"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(captured.status, 0, captured.stderr);
  const cases = JSON.parse(captured.stdout);
  docker([
    "run",
    "-d",
    "--name",
    name,
    "--network",
    "none",
    "-e",
    "MYSQL_ALLOW_EMPTY_PASSWORD=yes",
    "-e",
    "MYSQL_DATABASE=clinic_test",
    image,
  ]);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = spawnSync(
      "docker",
      ["exec", name, "mysql", "-uroot", "clinic_test", "-e", "SELECT 1"],
      { encoding: "utf8" },
    );
    if (
      result.status === 0 &&
      docker(["logs", name]).includes(
        "MySQL init process done. Ready for start up.",
      )
    ) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, "MySQL startup");
  for (const migration of readdirSync(resolve(root, "prisma/migrations"))
    .filter((name) => /^\d/.test(name))
    .sort())
    sql(
      readFileSync(
        resolve(root, "prisma/migrations", migration, "migration.sql"),
        "utf8",
      ),
    );
  sql(`INSERT INTO Professional(id,name) VALUES(1,'Synthetic professional');
INSERT INTO User(id,name,email,passwordHash,role) VALUES(7,'Synthetic actor','synthetic@example.test','not-a-password','ADMIN');
INSERT INTO customers(id,name,phone,updatedAt) VALUES(1,'Synthetic% customer','00000000000',NOW()),(2,'Other customer','00000000001',NOW());
INSERT INTO ProcedureCategory(id,name) VALUES(1,'Laser'),(2,'Other');
INSERT INTO \`Procedure\`(id,categoryId,name,durationMinutes,price) VALUES(1,1,'Synthetic laser',30,100),(2,2,'Other',30,100);
INSERT INTO Sale(id,customerId,professionalId,discount,createdAt,cancelled) VALUES
(1,1,1,0,'2026-11-01 03:00:00',false),(2,1,1,0,'2026-11-01 10:00:00',false),(3,1,1,0,'2026-11-02 02:59:59',false),(4,1,NULL,0,'2026-11-01 12:00:00',true),(5,1,NULL,0,'2026-11-01 12:00:00',false),(6,1,NULL,0,'2026-11-01 12:00:00',false),(7,2,NULL,0,'2026-11-01 02:59:59',false);
INSERT INTO SaleItem(saleId,procedureId,description,sessions,unitPrice,finalPrice) VALUES(1,1,'Laser',1,100,100),(2,1,'Laser',1,100,100),(3,1,'Laser',1,100,100),(4,1,'Laser',1,100,100),(5,1,'Laser',1,100,100),(6,1,'Free',1,0,0),(7,2,'Other',1,100,100);
INSERT INTO SalePayment(id,saleId,amount,method) VALUES(1,2,100,'PIX'),(2,3,40,'PIX'),(3,5,100,'PIX');
INSERT INTO PaymentReversal(paymentId,actorId,reason,requestKey) VALUES(3,7,'Synthetic reversal','synthetic-reversal');
INSERT INTO Expense(id,description,category,amount,dueDate,paid,recurrence,cancelled,allocationRevision) VALUES(1,'Synthetic material','INSUMOS',100,'2026-11-01',false,'ONCE',false,2),(2,'Synthetic rent','ALUGUEL_ESTRUTURA',200,'2026-11-01',true,'ONCE',false,2),(3,'Synthetic cancelled','INSUMOS',50,'2026-11-01',true,'ONCE',true,0);
INSERT INTO ExpenseRevision(id,expenseId,version,description,category,amount,dueDate,competenceMonth,recurrence,destination,basis,allocationNote,reason,actorId) VALUES
(1,1,1,'Old','INSUMOS',100,'2026-11-01','2026-11','ONCE','GENERAL','VALUE','Synthetic','Synthetic',7),
(2,1,2,'Current','INSUMOS',100,'2026-11-01','2026-11','ONCE','PROCEDURES','VALUE','Synthetic','Synthetic',7),
(3,2,1,'Old','ALUGUEL_ESTRUTURA',200,'2026-11-01','2026-11','ONCE','PROCEDURES','VALUE','Synthetic','Synthetic',7),
(4,2,2,'Current','ALUGUEL_ESTRUTURA',200,'2026-11-01','2026-11','ONCE','GENERAL','VALUE','Synthetic','Synthetic',7);
INSERT INTO ExpenseAllocation(revisionId,procedureId,procedureName,inputValue,amount) VALUES(2,1,'Laser',100,100),(3,1,'Laser',200,200);`);
  for (const entry of cases) {
    let index = 0;
    const query = entry.sql.replace(/\?/g, () => {
      const value = entry.values[index++];
      if (value === null) return "NULL";
      if (typeof value === "number") return String(value);
      if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
      const text =
        typeof value === "object" && value.date
          ? value.date.replace("T", " ").replace("Z", "")
          : String(value);
      return "'" + text.replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
    });
    const result = sql(query);
    const ids = result ? result.split("\n").map(Number) : [];
    assert.deepEqual(ids, entry.expected, entry.name);
    console.log("PASS", entry.name);
  }
  const unrelated = Array.from({ length: 60 }, (_, index) => 100 + index);
  sql(
    "INSERT INTO Sale(id,customerId,discount,createdAt) VALUES " +
      unrelated.map((id) => `(${id},2,0,'2026-11-01 12:00:00')`).join(",") +
      "; INSERT INTO SaleItem(saleId,procedureId,description,sessions,unitPrice,finalPrice) VALUES " +
      unrelated.map((id) => `(${id},2,'Other',1,100,100)`).join(",") +
      ";",
  );
  const categoryCase = cases.find(
    (entry) => entry.name === "category and inclusive Sao Paulo day",
  );
  let categoryIndex = 0;
  const categoryQuery = categoryCase.sql.replace(/\?/g, () => {
    const value = categoryCase.values[categoryIndex++];
    return typeof value === "number"
      ? String(value)
      : "'" + value.date.replace("T", " ").replace("Z", "") + "'";
  });
  assert.deepEqual(
    sql(categoryQuery).split("\n").map(Number),
    categoryCase.expected,
  );
  console.log(
    "PASS category filters find older matching sales beyond 60 newer unrelated records",
  );
  // Exercise the actual join used when issuing a session for a linked professional.
  sql(
    "INSERT INTO User(id,name,email,passwordHash,role,professionalId) VALUES(8,'Synthetic employee','employee@example.test','hash','FUNCIONARIO',1); UPDATE Professional SET active = false WHERE id=1;",
  );
  assert.equal(
    sql(
      "START TRANSACTION; SELECT p.active FROM User u LEFT JOIN Professional p ON p.id=u.professionalId WHERE u.id=8 FOR UPDATE; ROLLBACK;",
    ),
    "0",
  );
  console.log(
    "PASS session lock with inactive professional; all migrations applied only in disposable MySQL",
  );
} finally {
  if (created) docker(["rm", "-f", name]);
}
