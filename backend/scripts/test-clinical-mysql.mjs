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
  // Synthetic commercial contracts: preserved terms, two distinct discount sources and immutable rights.
  sql(`INSERT INTO CommercialOffer(id,name,actorId) VALUES(1,'Synthetic offer',7);
 INSERT INTO CommercialOfferVersion(id,offerId,version,name,startsOn,price,referenceAmount,actorId) VALUES(1,1,1,'Preserved offer name','2026-01-01',850,1000,7);
 INSERT INTO CommercialOfferItem(id,versionId,procedureId,procedureName,sessions,referenceUnitPrice) VALUES(1,1,1,'Synthetic HIFU',10,100);
 INSERT INTO Sale(id,customerId,professionalId,discount,commercialModel,actorId,confirmedAt,allowUnpaidUse,requestKey,requestHash) VALUES(1,1,1,50,'V1',7,NOW(),false,'synthetic-sale-1',REPEAT('a',64));
 INSERT INTO SaleOfferPurchase(id,saleId,versionId,offerName,quantity) VALUES(1,1,1,'Preserved offer name',1);
 INSERT INTO SaleItem(id,saleId,procedureId,description,sessions,unitPrice,finalPrice,offerPurchaseId,referenceAmount,promotionalDiscount,negotiatedDiscount,netAmount) VALUES(1,1,1,'Synthetic contract',10,100,850,1,1000,150,50,800);
 INSERT INTO SaleDiscount(id,saleId,itemId,kind,type,scope,value,baseAmount,amount,reason,actorId) VALUES(1,1,1,'PROMOTIONAL','FIXED','ITEM',150,1000,150,'Published offer',7),(2,1,NULL,'NEGOTIATED','FIXED','SALE',50,850,50,'Authorized negotiation',7);
 INSERT INTO SessionEntitlement(id,saleId,saleItemId,customerId,procedureId,description,quantity) VALUES(1,1,1,1,1,'Synthetic package',10);
 INSERT INTO SalePayment(id,saleId,method,amount,actorId,requestKey) VALUES(1,1,'PIX',800,7,'synthetic-payment');
 INSERT INTO ReceivableInstallment(id,saleId,number,amount,dueOn) VALUES(1,1,1,800,'2026-11-01');
 INSERT INTO PaymentAllocation(id,paymentId,receivableId,amount) VALUES(1,1,1,800);
 INSERT INTO SessionRedemption(id,entitlementId,executionId,quantityDelta,actorId,requestKey) VALUES(1,1,1,1,7,'synthetic-redemption');
 INSERT INTO SessionReservation(id,entitlementId,appointmentId,status) VALUES(1,1,1,'REDEEMED');
 INSERT INTO CommercialEvent(id,saleId,type,actorId,details) VALUES(1,1,'SALE_CONFIRMED',7,JSON_OBJECT('total',800));`);
  assert.equal(
    sql("SELECT SUM(netAmount) FROM SaleItem WHERE saleId=1;"),
    "800.00",
  );
  assert.equal(
    sql("SELECT SUM(amount) FROM SaleDiscount WHERE kind='PROMOTIONAL';"),
    "150.00",
  );
  assert.equal(
    sql("SELECT SUM(amount) FROM SaleDiscount WHERE kind='NEGOTIATED';"),
    "50.00",
  );
  for (const table of [
    "CommercialOfferVersion",
    "CommercialOfferItem",
    "SaleOfferPurchase",
    "SaleItem",
    "SaleDiscount",
    "SalePayment",
    "SessionEntitlement",
    "SessionRedemption",
    "ReceivableInstallment",
    "PaymentAllocation",
    "CommercialEvent",
  ]) {
    assert.match(
      sql(`UPDATE \`${table}\` SET id=id WHERE id=1;`, true),
      /Immutable commercial record/,
    );
    assert.match(
      sql(`DELETE FROM \`${table}\` WHERE id=1;`, true),
      /Immutable commercial record/,
    );
  }
  sql(`INSERT INTO CommercialOfferVersion(id,offerId,version,name,startsOn,price,referenceAmount,actorId) VALUES(2,1,2,'New offer name','2026-12-01',900,1000,7);
 INSERT INTO PaymentReversal(id,paymentId,actorId,reason,requestKey) VALUES(1,1,7,'Synthetic refund','synthetic-refund');
 INSERT INTO SessionRedemption(entitlementId,quantityDelta,actorId,reason,requestKey,reversesId) VALUES(1,-1,7,'Synthetic session correction','synthetic-session-reversal',1);`);
  assert.equal(
    sql("SELECT price FROM CommercialOfferVersion WHERE id=1;"),
    "850.00",
  );
  assert.equal(
    sql(
      "SELECT SUM(quantityDelta) FROM SessionRedemption WHERE entitlementId=1;",
    ),
    "0",
  );
  assert.equal(sql("SELECT COUNT(*) FROM SalePayment;"), "1");
  assert.equal(
    sql(
      "SELECT COALESCE(SUM(p.amount),0) FROM SalePayment p LEFT JOIN PaymentReversal r ON r.paymentId=p.id WHERE r.id IS NULL;",
    ),
    "0.00",
  );
  assert.match(
    sql("UPDATE PaymentReversal SET reason=reason WHERE id=1;", true),
    /Immutable commercial record/,
  );
  assert.match(
    sql(
      "INSERT INTO PaymentReversal(paymentId,actorId,reason,requestKey) VALUES(1,7,'Duplicated refund','another-refund');",
      true,
    ),
    /Duplicate entry/,
  );
  sql(`INSERT INTO Sale(id,customerId,professionalId,discount,commercialModel,actorId,confirmedAt,allowUnpaidUse,requestKey,requestHash) VALUES(2,1,1,0,'V1',7,NOW(),false,'synthetic-sale-2',REPEAT('b',64));
 INSERT INTO SaleItem(id,saleId,procedureId,description,sessions,unitPrice,finalPrice,referenceAmount,promotionalDiscount,negotiatedDiscount,netAmount) VALUES(2,2,1,'Last session',1,100,100,100,0,0,100);
 INSERT INTO SessionEntitlement(id,saleId,saleItemId,customerId,procedureId,description,quantity) VALUES(2,2,2,1,1,'Last session',1);
 INSERT INTO ProcedureExecution(id,attendanceId,procedureId,professionalId,equipmentId,procedureName,technology) VALUES(2,1,1,1,1,'Synthetic HIFU','HIFU'),(3,1,1,1,1,'Synthetic HIFU','HIFU');`);
  const claim = (executionId) =>
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
        `SET TRANSACTION ISOLATION LEVEL READ COMMITTED; START TRANSACTION; SELECT id FROM SessionEntitlement WHERE id=2 FOR UPDATE; SELECT COALESCE(SUM(quantityDelta),0) INTO @used FROM SessionRedemption WHERE entitlementId=2; INSERT INTO SessionRedemption(entitlementId,executionId,quantityDelta,actorId,requestKey) SELECT 2,${executionId},1,7,UUID() WHERE @used<1; SELECT ROW_COUNT(); COMMIT;`,
      );
    });
  assert.deepEqual(
    (await Promise.all([claim(2), claim(3)]))
      .map((r) => r.split("\n").at(-1))
      .sort(),
    ["0", "1"],
  );
  assert.equal(
    sql(
      "SELECT SUM(quantityDelta) FROM SessionRedemption WHERE entitlementId=2;",
    ),
    "1",
  );
  console.log(
    "Commercial SQL passed: preserved offer versions, discount classification, immutable contracts/rights, payment and session reversals, and two connections competing for the last session.",
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
