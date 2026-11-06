import assert from "node:assert/strict";
import { test } from "node:test";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { contractApp } from "./app-harness";

function upload(filename: string, mime: string, content: string) {
  const body = new FormData();
  body.set("file", new Blob([content], { type: mime }), filename);
  return body;
}

test("documentos continuam no cliente, armazenamento compartilhado preserva leitura autenticada", async () => {
  const app = await contractApp();
  let storedPath: string | undefined;
  try {
    let document: any;
    app.db.customer.findUniqueOrThrow = async () => ({ id: 1 });
    app.db.customerDocument.create = async ({ data }: any) => {
      document = { id: 1, ...data, createdAt: new Date() };
      storedPath = resolve(process.cwd(), data.fileUrl.slice(1));
      return document;
    };
    app.db.customerDocument.findMany = async () => (document ? [document] : []);
    await app.start();
    assert.equal(
      (
        await app.request("/api/v1/customers/1/documents", {
          role: "ANONYMOUS",
        })
      ).status,
      401,
    );
    const content = "%PDF-1.4\nsynthetic document";
    const response = await app.request("/api/v1/customers/1/documents", {
      method: "POST",
      body: upload("synthetic.pdf", "application/pdf", content),
    });
    assert.equal(response.status, 201);
    const data: any = await response.json();
    assert.equal(data.documents[0].customerId, 1);
    const fileUrl = data.documents[0].fileUrl;
    const file = await app.request(fileUrl);
    assert.equal(file.status, 200);
    assert.match(file.headers.get("content-type")!, /application\/pdf/);
    assert.equal(file.headers.get("cache-control"), "private, max-age=600");
    assert.equal(await file.text(), content);
    assert.equal(
      (await app.request(fileUrl, { role: "ANONYMOUS" })).status,
      401,
    );
    assert.equal(
      (
        await app.request(
          "/uploads/unknown/00000000-0000-0000-0000-000000000000.pdf",
        )
      ).status,
      400,
    );
  } finally {
    await app.close();
    if (storedPath) await rm(storedPath, { force: true });
  }
});

test("separação das imagens mantém permissão administrativa e validação do conteúdo", async () => {
  const app = await contractApp();
  try {
    await app.start();
    assert.equal(
      (
        await app.request("/api/v1/procedures/1/images", {
          method: "POST",
          role: "FUNCIONARIO",
          body: {},
        })
      ).status,
      403,
    );
    assert.equal(
      (await app.request("/api/v1/customers/1/photos", { role: "ANONYMOUS" }))
        .status,
      401,
    );
    const pdf = upload(
      "synthetic.pdf",
      "application/pdf",
      "%PDF-1.4\nsynthetic",
    );
    assert.equal(
      (
        await app.request("/api/v1/customers/1/photos", {
          method: "POST",
          body: pdf,
        })
      ).status,
      400,
    );
    const fake = upload("synthetic.png", "image/png", "this is not an image");
    assert.equal(
      (
        await app.request("/api/v1/customers/1/photos", {
          method: "POST",
          body: fake,
        })
      ).status,
      400,
    );
  } finally {
    await app.close();
  }
});
