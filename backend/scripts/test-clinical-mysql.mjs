import { spawnSync, spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const name = `monalisa-clinical-test-${process.pid}`;
const image =
  "mysql:8.4@sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902";
let created = false;
function docker(args, input) {
  const r = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    timeout: 180000,
  });
  if (r.error) throw r.error;
  return r;
}
function sql(query, expectError = false) {
  const r = docker(
    ["exec", "-i", name, "mysql", "-uroot", "-N", "clinic_test"],
    query,
  );
  if (expectError) {
    assert.notEqual(r.status, 0, "Mutation should have been rejected");
    return r.stderr;
  }
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
try {
  const r = docker([
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
  assert.equal(r.status, 0, r.stderr);
  created = true;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (
      docker(["logs", name]).stdout.includes(
        "MySQL init process done. Ready for start up.",
      ) &&
      docker([
        "exec",
        name,
        "mysql",
        "-uroot",
        "clinic_test",
        "-e",
        "SELECT 1;",
      ]).status === 0
    ) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(ready, "MySQL did not start");
  for (const migration of readdirSync(resolve(root, "prisma/migrations"))
    .filter((n) => /^\d/.test(n))
    .sort()) {
    sql(
      readFileSync(
        resolve(root, "prisma/migrations", migration, "migration.sql"),
        "utf8",
      ),
    );
    console.log(`Applied SQL: ${migration}`);
  }
  sql(`INSERT INTO Professional(id,name) VALUES(1,'Synthetic professional');
 INSERT INTO User(id,name,email,passwordHash,role) VALUES(7,'Synthetic actor','synthetic@example.test','not-a-real-password','ADMIN');
 INSERT INTO customers(id,name,phone,updatedAt) VALUES(1,'Synthetic customer','00000000000',NOW());
 INSERT INTO ProcedureCategory(id,name) VALUES(1,'Synthetic category');
 INSERT INTO \`Procedure\`(id,categoryId,name,durationMinutes,price,technology,requiresEquipment) VALUES(1,1,'Synthetic HIFU',30,100,'HIFU',true);
 INSERT INTO Equipment(id,code,name,shotTracking,updatedAt) VALUES(1,'TEST-EQ','Synthetic equipment','COMPONENT',NOW());
 INSERT INTO EquipmentComponent(id,equipmentId,code,name,nominalCapacity,updatedAt) VALUES(1,1,'TEST-COMP','Synthetic cartridge',100,NOW());
 INSERT INTO Appointment(id,customerId,professionalId,procedureId,startsAt,endsAt,status) VALUES(1,1,1,1,NOW()-INTERVAL 1 HOUR,NOW(),'CONFIRMED');
 INSERT INTO Attendance(id,appointmentId,customerId,professionalId,startedById,startedAt) VALUES(1,1,1,1,7,NOW()-INTERVAL 1 HOUR);
 INSERT INTO ProcedureExecution(id,attendanceId,procedureId,professionalId,equipmentId,procedureName,technology) VALUES(1,1,1,1,1,'Synthetic HIFU','HIFU');
 INSERT INTO StockItem(id,name,unit,quantity) VALUES(1,'Synthetic gel','pot',3);
 INSERT INTO MaterialUsage(executionId,stockItemId,materialName,\`usage\`) VALUES(1,1,'Synthetic gel','SMALL');
 INSERT INTO ShotLedgerEntry(equipmentId,componentId,type,quantityDelta,actorId,reason,requestKey) VALUES(1,1,'OPENING',0,7,'New cartridge','initial');
 INSERT INTO ShotLedgerEntry(equipmentId,componentId,executionId,type,quantityDelta,actorId,requestKey) VALUES(1,1,1,'CONSUMPTION',20,7,'execution');
 INSERT INTO StockMovement(stockItemId,type,quantityDelta,actorId,requestKey) VALUES(1,'IN',3,7,'stock-in');`);
  assert.equal(
    sql("SELECT quantity FROM StockItem WHERE id=1;"),
    "3.000",
    "Material usage must not consume stock",
  );
  assert.equal(
    sql("SELECT SUM(quantityDelta) FROM ShotLedgerEntry WHERE equipmentId=1;"),
    "20",
  );
  for (const table of [
    "ShotLedgerEntry",
    "StockMovement",
    "MaterialUsage",
    "ProcedureExecution",
  ]) {
    assert.match(
      sql(`UPDATE \`${table}\` SET id=id WHERE id=1;`, true),
      /Immutable audit record/,
    );
    assert.match(
      sql(`DELETE FROM \`${table}\` WHERE id=1;`, true),
      /Immutable audit record/,
    );
  }
  assert.match(
    sql("UPDATE Equipment SET id=11 WHERE id=1;", true),
    /foreign key constraint/i,
  );
  assert.equal(sql("SELECT COUNT(*) FROM Equipment WHERE id=1;"), "1");
  assert.match(
    sql(
      "INSERT INTO MaterialUsage(executionId,stockItemId,materialName,`usage`) VALUES(1,1,'x','INVALID');",
      true,
    ),
    /check constraint/i,
  );
  assert.match(
    sql(
      "INSERT INTO ShotLedgerEntry(equipmentId,componentId,type,quantityDelta,actorId,reason,requestKey) VALUES(1,1,'OPENING',-1,7,'bad opening','invalid');",
      true,
    ),
    /check constraint/i,
  );
  sql(
    "INSERT INTO ShotLedgerEntry(equipmentId,componentId,executionId,type,quantityDelta,actorId,reason,requestKey,reversesId) VALUES(1,1,1,'REVERSAL',-20,7,'Synthetic correction','reverse',2);",
  );
  assert.equal(
    sql("SELECT SUM(quantityDelta) FROM ShotLedgerEntry WHERE equipmentId=1;"),
    "0",
  );
  assert.equal(
    sql("SELECT COUNT(*) FROM ShotLedgerEntry;"),
    "3",
    "Reversal must preserve original entries",
  );
  // Real independent connections compete for the same stock balance.
  const consume = () =>
    new Promise((resolve, reject) => {
      const p = spawn("docker", [
        "exec",
        "-i",
        name,
        "mysql",
        "-uroot",
        "-N",
        "clinic_test",
      ]);
      let out = "",
        err = "";
      p.stdout.on("data", (d) => (out += d));
      p.stderr.on("data", (d) => (err += d));
      p.on("error", reject);
      p.on("close", (code) =>
        code ? reject(new Error(err)) : resolve(out.trim()),
      );
      p.stdin.end(
        "START TRANSACTION; SELECT id FROM StockItem WHERE id=1 FOR UPDATE; UPDATE StockItem SET quantity=quantity-2 WHERE id=1 AND quantity>=2; SET @changed=ROW_COUNT(); INSERT INTO StockMovement(stockItemId,type,quantityDelta,actorId,note,requestKey) SELECT 1,'CONSUMPTION',-2,7,'Finished packages',UUID() WHERE @changed=1; SELECT @changed; COMMIT;",
      );
    });
  const result = await Promise.all([consume(), consume()]);
  assert.deepEqual(result.map((x) => x.split("\n").at(-1)).sort(), ["0", "1"]);
  assert.equal(sql("SELECT quantity FROM StockItem WHERE id=1;"), "1.000");
  assert.equal(
    sql("SELECT SUM(quantityDelta) FROM StockMovement WHERE stockItemId=1;"),
    "1.000",
  );
  console.log(
    `MySQL ${sql("SELECT VERSION();")}: SQL migrations, audit immutability, material/stock separation, reversals and competing stock updates passed.`,
  );
  console.log(
    "This checks SQL directly; Prisma migrate deployment still needs validation in the target environment.",
  );
} finally {
  if (created) {
    const r = docker(["rm", "-fv", name]);
    if (r.status !== 0)
      console.error("Could not remove owned test container:", name);
  }
}
