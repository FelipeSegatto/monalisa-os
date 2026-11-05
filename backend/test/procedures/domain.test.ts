import assert from "node:assert/strict";
import { test } from "node:test";
import { Procedure } from "../../src/procedures/domain/procedure";
import { MaterialRequirement } from "../../src/procedures/domain/material-requirement";
const details = {
  categoryId: 1,
  name: "Tratamento",
  description: null,
  durationMinutes: 30,
  price: 100,
};
const option = {
  name: "Axilas",
  groupName: "Corpo",
  reference: null,
  price: 90,
  active: true,
};
const available = { reviewed: true, hasActiveCompatible: true };
function existing() {
  return Procedure.restore({
    ...Procedure.create(details).snapshot(),
    id: 1,
    options: [
      { ...option, id: 10, kind: "AREA", sortOrder: 0 },
      { ...option, id: 11, name: "Virilha", kind: "AREA", sortOrder: 1 },
    ],
  });
}
test("HIFU e lasers exigem aparelho independentemente do nome e só ativam com revisão e recurso ativo", () => {
  for (const technology of [
    "HIFU",
    "LASER_HAIR_REMOVAL",
    "TATTOO_REMOVAL",
  ] as const) {
    const procedure = Procedure.create(details);
    assert.throws(() => procedure.configureEquipment(technology, false));
    procedure.configureEquipment(technology, true);
    procedure.updateDetails({ ...details, name: "Nome alterado" });
    assert.throws(() =>
      procedure.activate({ reviewed: false, hasActiveCompatible: true }),
    );
    assert.throws(() =>
      procedure.activate({ reviewed: true, hasActiveCompatible: false }),
    );
    procedure.activate(available);
    assert.equal(procedure.snapshot().active, true);
    assert.throws(() => procedure.configureEquipment("GENERAL", false));
  }
});
test("procedimento geral pode usar ambos, um ou nenhum recurso e preservar cadastro incompleto", () => {
  const procedure = Procedure.create(details);
  procedure.activate({ reviewed: false, hasActiveCompatible: false });
  assert.equal(procedure.snapshot().requiresEquipment, false);
  procedure.configureMaterials([], new Date());
  assert.equal(procedure.snapshot().materials.length, 0);
  procedure.configureEquipment("GENERAL", true);
  procedure.deactivate();
  assert.throws(() =>
    procedure.activate({ reviewed: false, hasActiveCompatible: false }),
  );
  assert.equal(procedure.snapshot().active, false);
});
test("nome e preço alterados não substituem identidade de opção nem apagam removidas", () => {
  const procedure = existing();
  procedure.replaceOptions([
    { ...option, id: 10, name: "Axilas completas", price: 95 },
  ]);
  const options = procedure.snapshot().options;
  assert.equal(options[0].id, 10);
  assert.equal(options[0].name, "Axilas completas");
  assert.equal(options[0].kind, "AREA");
  assert.equal(options[1].id, 11);
  assert.equal(options[1].active, false);
  assert.equal(options[1].sortOrder, 1);
});
test("IDs externos e repetidos não provocam alteração parcial", () => {
  const procedure = existing(),
    before = procedure.snapshot();
  assert.throws(() =>
    procedure.replaceOptions([
      { ...option, id: 10, name: "Alterado" },
      { ...option, id: 999 },
    ]),
  );
  assert.deepEqual(procedure.snapshot(), before);
  assert.throws(() =>
    procedure.replaceOptions([
      { ...option, id: 10 },
      { ...option, id: 10 },
    ]),
  );
  assert.deepEqual(procedure.snapshot(), before);
});
test("clientes legados só reconciliam correspondências exatas, nunca presumem renomeação", () => {
  const procedure = existing();
  procedure.replaceOptions([{ ...option, price: 95 }]);
  assert.equal(procedure.snapshot().options[0].id, 10);
  procedure.replaceOptions([{ ...option, name: "Nova opção" }]);
  assert.equal(procedure.snapshot().options[0].id, null);
  assert.equal(
    procedure.snapshot().options.find((o) => o.id === 10)?.active,
    false,
  );
});
test("áreas e tamanhos são dados manuais; referência textual não classifica dimensão", () => {
  const procedure = Procedure.create(details);
  procedure.replaceOptions([
    {
      ...option,
      name: "Pequena",
      groupName: "Tamanho",
      kind: "SIZE",
      reference: "até 3 cm",
    },
  ]);
  assert.equal(procedure.snapshot().options[0].reference, "até 3 cm");
  assert.equal(procedure.snapshot().options[0].kind, "SIZE");
});
test("materiais rejeitam duplicação, quantidade inválida e precisão incompatível com o banco", () => {
  const procedure = Procedure.create(details);
  assert.throws(() =>
    procedure.configureMaterials(
      [
        { stockItemId: 1, quantity: 1 },
        { stockItemId: 1, quantity: 2 },
      ],
      new Date(),
    ),
  );
  assert.throws(() =>
    MaterialRequirement.from({ stockItemId: 1, quantity: 0 }),
  );
  assert.throws(() =>
    MaterialRequirement.from({ stockItemId: 1, quantity: 0.0005 }),
  );
  procedure.configureMaterials(
    [{ stockItemId: 1, quantity: 1.125 }],
    new Date(),
  );
  assert.equal(procedure.snapshot().materials[0].quantity, 1.125);
});
test("editar metadados não desativa catálogo quando o aparelho fica indisponível", () => {
  const procedure = Procedure.create(details);
  procedure.configureEquipment("HIFU", true);
  procedure.activate(available);
  procedure.updateDetails({ ...details, name: "HIFU revisado" });
  procedure.updateActivation(true, {
    reviewed: true,
    hasActiveCompatible: false,
  });
  assert.equal(procedure.snapshot().active, true);
});
