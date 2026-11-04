import { ProcedureEquipmentPanel } from "../equipment/ProcedureEquipmentPanel";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  apiFileUrl,
  createProcedure,
  getProcedure,
  getProcedureCategories,
  getProcedureMaterials,
  getStockItems,
  setProcedureActive,
  setProcedureMaterials,
  updateProcedure,
  uploadProcedureImages,
  type CurrentUser,
  type ProcedureCategory,
  type ProcedureDetail,
  type ProcedureMaterial,
  type StockItem,
} from "../../lib/api";
import { formatPrice } from "../../lib/format";
import "./ProcedureDetailPage.css";

interface Props {
  isNew?: boolean;
}

interface VariationRow {
  key: number;
  id: number | null;
  groupName: string;
  name: string;
  reference: string;
  price: string;
  active: boolean;
}

let nextKey = 1;

interface MaterialRow {
  key: number;
  stockItemId: number | "";
  quantity: string;
}

function emptyMaterial(): MaterialRow {
  return { key: nextKey++, stockItemId: "", quantity: "1" };
}

function toMaterialRows(materials: ProcedureMaterial[]): MaterialRow[] {
  return materials.map((material) => ({
    key: nextKey++,
    stockItemId: material.stockItemId,
    quantity: String(material.quantity),
  }));
}

function emptyVariation(groupName = ""): VariationRow {
  return {
    key: nextKey++,
    id: null,
    groupName,
    name: "",
    reference: "",
    price: "0",
    active: true,
  };
}

function toVariationRows(detail: ProcedureDetail): VariationRow[] {
  return detail.variations.map((variation) => ({
    key: nextKey++,
    id: variation.id,
    groupName: variation.groupName ?? "",
    name: variation.name,
    reference: variation.reference ?? "",
    price: String(variation.price),
    active: variation.active,
  }));
}

export function ProcedureDetailPage({ isNew = false }: Props) {
  const user = useOutletContext<CurrentUser | null>();
  const canManage = user?.role !== "FUNCIONARIO";
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const procedureId = isNew ? null : Number(params.id);

  const [categories, setCategories] = useState<ProcedureCategory[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [variations, setVariations] = useState<VariationRow[]>([]);
  const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<"cover" | "detail" | null>(null);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [resourceRevision, setResourceRevision] = useState(0);
  const [materialsEditing, setMaterialsEditing] = useState(false);
  const [materialsSaving, setMaterialsSaving] = useState(false);
  const [materialsSaveError, setMaterialsSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProcedureCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => undefined);

    if (!isNew && procedureId) {
      getProcedure(procedureId)
        .then((detail) => {
          if (cancelled) return;
          setName(detail.name);
          setCategoryId(detail.categoryId);
          setDurationMinutes(String(detail.durationMinutes));
          setPrice(String(detail.price));
          setDescription(detail.description ?? "");
          setActive(detail.active);
          setVariations(toVariationRows(detail));
          setCoverImageUrl(detail.coverImageUrl);
          setDetailImageUrl(detail.detailImageUrl);
          setLoading(false);
          setUpdatedLabel(
            new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          );
        })
        .catch((err: Error) => {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [isNew, procedureId]);

  useEffect(() => {
    if (isNew || !procedureId || !canManage) return;
    let cancelled = false;

    getStockItems()
      .then((items) => {
        if (!cancelled) setStockItems(items.filter((item) => item.active));
      })
      .catch(() => undefined);

    getProcedureMaterials(procedureId)
      .then((data) => {
        if (!cancelled) setMaterials(toMaterialRows(data));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isNew, procedureId, canManage]);

  const hasReference = variations.some((v) => v.reference.trim() !== "");

  function updateVariation(key: number, patch: Partial<VariationRow>) {
    setVariations((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeVariation(key: number) {
    setVariations((current) => current.filter((row) => row.key !== key));
  }

  function addVariation() {
    const lastGroup = variations.at(-1)?.groupName ?? "";
    setVariations((current) => [...current, emptyVariation(lastGroup)]);
  }

  function updateMaterial(key: number, patch: Partial<MaterialRow>) {
    setMaterials((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeMaterial(key: number) {
    setMaterials((current) => current.filter((row) => row.key !== key));
  }

  function addMaterial() {
    setMaterials((current) => [...current, emptyMaterial()]);
  }

  async function handleSaveMaterials() {
    if (!procedureId) return;
    if (materials.some((row) => !row.stockItemId || Number(row.quantity) <= 0)) {
      setMaterialsSaveError("Selecione um item e informe uma quantidade maior que zero em cada linha.");
      return;
    }
    setMaterialsSaving(true);
    setMaterialsSaveError(null);
    try {
      const saved = await setProcedureMaterials(
        procedureId,
        materials.map((row) => ({
          stockItemId: row.stockItemId as number,
          quantity: Number(row.quantity),
        })),
      );
      setMaterials(toMaterialRows(saved));
      setResourceRevision(v => v + 1);
      setMaterialsEditing(false);
    } catch (err) {
      setMaterialsSaveError(
        err instanceof Error ? err.message : "Não foi possível salvar os materiais.",
      );
    } finally {
      setMaterialsSaving(false);
    }
  }

  async function handleSave() {
    if (!categoryId) {
      setSaveError("Selecione uma categoria.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    const input = {
      categoryId,
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      durationMinutes: Number(durationMinutes),
      price: Number(price),
      active,
      variations: variations
        .filter((row) => row.name.trim() !== "")
        .map((row) => ({
          groupName: row.groupName.trim() ? row.groupName.trim() : null,
          name: row.name.trim(),
          reference: row.reference.trim() ? row.reference.trim() : null,
          price: Number(row.price),
          active: row.active,
        })),
    };

    try {
      const saved = isNew
        ? await createProcedure(input)
        : await updateProcedure(procedureId as number, input);
      setSaving(false);
      setEditing(false);
      if (isNew) {
        navigate(`/procedimentos/${saved.id}`, { replace: true });
      } else {
        setVariations(toVariationRows(saved));
      }
    } catch (err) {
      setSaving(false);
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function handleImageUpload(kind: "cover" | "detail", file: File) {
    if (!procedureId) return;
    setUploadingImage(kind);
    try {
      const updated = await uploadProcedureImages(procedureId, { [kind]: file });
      setCoverImageUrl(updated.coverImageUrl);
      setDetailImageUrl(updated.detailImageUrl);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploadingImage(null);
    }
  }

  async function handleToggleActive() {
    if (!procedureId) return;
    try {
      const updated = await setProcedureActive(procedureId, !active);
      setActive(updated.active);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
    }
  }

  if (loading) {
    return <p className="page-status">Carregando…</p>;
  }

  if (error) {
    return <p className="page-status">Não foi possível carregar o procedimento.</p>;
  }

  const groupOrder: string[] = [];
  for (const row of variations) {
    if (!groupOrder.includes(row.groupName)) groupOrder.push(row.groupName);
  }

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate("/procedimentos")}>
        ← Todos os procedimentos
      </button>

      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">
            {categories.find((c) => c.id === categoryId)?.name ?? "Procedimento"}
          </p>
          <h1 className="page-header-title">{isNew ? "Novo procedimento" : name || "—"}</h1>
        </div>
        <div className="page-actions">
          {canManage ? (
            <>
              {!isNew && (
                <button type="button" className="secondary-button" onClick={handleToggleActive}>
                  {active ? "Desativar" : "Ativar"}
                </button>
              )}
              <button
                type="button"
                className="primary-button primary-button-link"
                disabled={saving}
                onClick={() => (editing ? handleSave() : setEditing(true))}
              >
                {saving ? "Salvando…" : editing ? "Salvar alterações" : "Editar"}
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className="detail-status">
        <span className={active ? "active-badge is-active" : "active-badge"}>
          {active ? "Ativo no catálogo" : "Inativo"}
        </span>
        {updatedLabel ? <span className="section-meta">Atualizado em {updatedLabel}</span> : null}
      </div>

      {saveError ? <p className="form-error">{saveError}</p> : null}

      <div className="procedure-detail">
        <main>
          {!isNew && procedureId && <ProcedureEquipmentPanel key={resourceRevision} procedureId={procedureId} canManage={canManage} />}
          <div className="section-header">
            <span className="section-label">Informações gerais</span>
          </div>
          <div className="field-grid">
            <label className="field">
              Nome
              <input
                className="text-input"
                disabled={!editing}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="field">
              Categoria
              <select
                className="select-input"
                disabled={!editing}
                value={categoryId ?? ""}
                onChange={(event) => setCategoryId(Number(event.target.value))}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Duração (min)
              <input
                className="text-input"
                type="number"
                min="1"
                disabled={!editing}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </label>
            <label className="field">
              Preço base
              <input
                className="text-input"
                type="number"
                min="0"
                step="0.01"
                disabled={!editing}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
            <label className="field field-full">
              Descrição
              <textarea
                className="textarea-input"
                disabled={!editing}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>

          <div className="section-header">
            <span className="section-label">Preços por variação</span>
            {editing && (
              <button type="button" className="text-button" onClick={addVariation}>
                + Adicionar variação
              </button>
            )}
          </div>

          {variations.length === 0 ? (
            <p className="procedure-empty">
              Sem variações cadastradas — usa o preço base acima.
            </p>
          ) : (
            <div className={`pricing-list ${hasReference ? "pricing-list--reference" : ""}`}>
              {hasReference && (
                <div className="pricing-columns">
                  <span>Grupo</span>
                  <span>Nome</span>
                  <span>Referência</span>
                  <span>Preço</span>
                  <span />
                </div>
              )}
              {groupOrder.map((groupName) => (
                <div className="price-group" key={groupName || "__ungrouped"}>
                  {groupName && (
                    <div className="price-group-title">
                      <span className="section-label">{groupName}</span>
                    </div>
                  )}
                  {variations
                    .filter((row) => row.groupName === groupName)
                    .map((row) => (
                      <div
                        className={`price-row ${!row.active ? "price-row--inactive" : ""}`}
                        key={row.key}
                      >
                        <input
                          className="text-input"
                          placeholder="Grupo (opcional)"
                          disabled={!editing}
                          value={row.groupName}
                          onChange={(event) =>
                            updateVariation(row.key, { groupName: event.target.value })
                          }
                        />
                        <input
                          className="text-input"
                          placeholder="Nome"
                          disabled={!editing}
                          value={row.name}
                          onChange={(event) =>
                            updateVariation(row.key, { name: event.target.value })
                          }
                        />
                        <input
                          className="text-input"
                          placeholder="Referência (opcional)"
                          disabled={!editing}
                          value={row.reference}
                          onChange={(event) =>
                            updateVariation(row.key, { reference: event.target.value })
                          }
                        />
                        <input
                          className="text-input"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!editing}
                          value={row.price}
                          onChange={(event) =>
                            updateVariation(row.key, { price: event.target.value })
                          }
                        />
                        {editing ? (
                          <div className="price-actions">
                            <button
                              type="button"
                              className="text-button"
                              onClick={() =>
                                updateVariation(row.key, { active: !row.active })
                              }
                            >
                              {row.active ? "Desativar" : "Ativar"}
                            </button>
                            <button
                              type="button"
                              className="text-button is-danger"
                              onClick={() => removeVariation(row.key)}
                            >
                              Remover
                            </button>
                          </div>
                        ) : !row.active ? (
                          <span className="active-badge">Inativo</span>
                        ) : (
                          <span />
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          {!isNew && canManage ? (
            <>
              <div className="section-header">
                <span className="section-label">Materiais utilizados</span>
                {materialsEditing ? (
                  <button type="button" className="text-button" onClick={addMaterial}>
                    + Adicionar material
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setMaterialsEditing(true)}
                  >
                    Editar
                  </button>
                )}
              </div>

              {materialsSaveError ? <p className="form-error">{materialsSaveError}</p> : null}

              {materials.length === 0 && !materialsEditing ? (
                <p className="procedure-empty">
                  Sem materiais vinculados — a baixa de estoque deste procedimento continua
                  manual.
                </p>
              ) : (
                <div className="price-group">
                  {materials.map((row) => {
                    const stockItem = stockItems.find((item) => item.id === row.stockItemId);
                    return (
                      <div className="price-row material-row" key={row.key}>
                        <select
                          className="select-input"
                          disabled={!materialsEditing}
                          value={row.stockItemId}
                          onChange={(event) =>
                            updateMaterial(row.key, {
                              stockItemId: event.target.value ? Number(event.target.value) : "",
                            })
                          }
                        >
                          <option value="" disabled>
                            Selecione o item…
                          </option>
                          {stockItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="text-input"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!materialsEditing}
                          value={row.quantity}
                          onChange={(event) =>
                            updateMaterial(row.key, { quantity: event.target.value })
                          }
                        />
                        <span className="section-meta">{stockItem?.unit ?? ""}</span>
                        {materialsEditing ? (
                          <div className="price-actions">
                            <button
                              type="button"
                              className="text-button is-danger"
                              onClick={() => removeMaterial(row.key)}
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {materialsEditing ? (
                <button
                  type="button"
                  className="primary-button primary-button-link"
                  disabled={materialsSaving}
                  onClick={handleSaveMaterials}
                >
                  {materialsSaving ? "Salvando…" : "Salvar materiais"}
                </button>
              ) : null}
            </>
          ) : null}
        </main>
        <aside>
          <div className="section-header">
            <span className="section-label">Prévia</span>
          </div>
          <p className="section-meta">
            Preço exibido no catálogo:{" "}
            <strong>
              {variations.filter((v) => v.active).length > 0
                ? `A partir de ${formatPrice(
                    Math.min(...variations.filter((v) => v.active).map((v) => Number(v.price))),
                  )}`
                : formatPrice(Number(price))}
            </strong>
          </p>

          {!isNew ? (
            <>
              <div className="section-header">
                <span className="section-label">Fotos do catálogo público</span>
              </div>
              <div className="procedure-image-field">
                <span className="section-meta">Capa</span>
                {coverImageUrl ? (
                  <img className="procedure-image-preview" src={apiFileUrl(coverImageUrl)} alt="" />
                ) : (
                  <p className="procedure-empty">Sem imagem de capa.</p>
                )}
                {canManage ? (
                  <label className="text-button">
                    {uploadingImage === "cover" ? "Enviando…" : "Enviar capa"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingImage !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleImageUpload("cover", file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>
              <div className="procedure-image-field">
                <span className="section-meta">Detalhe</span>
                {detailImageUrl ? (
                  <img className="procedure-image-preview" src={apiFileUrl(detailImageUrl)} alt="" />
                ) : (
                  <p className="procedure-empty">Sem imagem de detalhe.</p>
                )}
                {canManage ? (
                  <label className="text-button">
                    {uploadingImage === "detail" ? "Enviando…" : "Enviar detalhe"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingImage !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleImageUpload("detail", file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
