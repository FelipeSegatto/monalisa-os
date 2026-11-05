import { useCallback, useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { SaleDetailPanel } from "../finance/SaleDetailPanel";
import { PaymentPanel } from "../finance/PaymentPanel";
import {
  cancelSale,
  createNote,
  deleteNote,
  getCustomerSales,
  getDocuments,
  getNotes,
  getPhotos,
  getProcedureCategories,
  getSale,
  registerSalePayment,
  updateNote,
  uploadDocument,
  uploadPhoto,
  type CustomerDetail,
  type CustomerDocument,
  type CustomerNote,
  type CustomerPhoto,
  type DocumentStatus,
  type DocumentType,
  type PaymentMethod,
  type PhotoLabel,
  type ProcedureCategory,
  type SaleDetail,
  type SaleSummary,
} from "../../lib/api";
import { formatPrice, formatDateTime, formatLongDate } from "../../lib/format";
import "./ClientRecordsPanel.css";

type View = "notes" | "documents" | "photos" | "payments";
type Screen = View | "note-form" | "new-document" | "new-photo" | "compare";

const SALE_STATUS_LABELS: Record<SaleSummary["status"], string> = {
  CANCELLED: "Cancelada",
  PENDING: "Pendente",
  PARTIAL: "Parcialmente paga",
  PAID: "Paga",
};

interface Props {
  customer: CustomerDetail;
  initialView: View;
  close: () => void;
}

const TITLES: Record<Screen, string> = {
  notes: "Notas",
  "note-form": "Nota",
  documents: "Anamneses e contratos",
  "new-document": "Adicionar documento",
  photos: "Fotos de evolução",
  "new-photo": "Adicionar fotos",
  compare: "Comparar evolução",
  payments: "Pagamentos",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ANAMNESIS: "Anamnese",
  CONTRACT: "Contrato / termo",
  OTHER: "Outro documento",
};

const PHOTO_LABEL_LABELS: Record<PhotoLabel, string> = {
  BEFORE: "Antes",
  AFTER: "Depois",
  EVOLUTION: "Evolução",
  OTHER: "Outro",
};

export function ClientRecordsPanel({ customer, initialView, close }: Props) {
  const [screen, setScreen] = useState<Screen>(initialView);
  const [procedures, setProcedures] = useState<ProcedureCategory[]>([]);

  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<CustomerNote | null>(null);

  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [photos, setPhotos] = useState<CustomerPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);

  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [openSale, setOpenSale] = useState<SaleDetail | null>(null);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reloadSales = useCallback(() => {
    getCustomerSales(customer.id)
      .then((data) => {
        setSales(data);
        setSalesLoading(false);
      })
      .catch(() => setSalesLoading(false));
  }, [customer.id]);

  useEffect(() => {
    getProcedureCategories()
      .then(setProcedures)
      .catch(() => undefined);
    getNotes(customer.id)
      .then((data) => {
        setNotes(data);
        setNotesLoading(false);
      })
      .catch(() => setNotesLoading(false));
    getDocuments(customer.id)
      .then((data) => {
        setDocuments(data);
        setDocumentsLoading(false);
      })
      .catch(() => setDocumentsLoading(false));
    getPhotos(customer.id)
      .then((data) => {
        setPhotos(data);
        setPhotosLoading(false);
      })
      .catch(() => setPhotosLoading(false));
    reloadSales();
  }, [customer.id, reloadSales]);

  const appointmentOptions = [customer.nextAppointment, ...customer.history].filter(
    (a): a is NonNullable<typeof a> => a !== null,
  );
  const procedureOptions = procedures.flatMap((category) => category.procedures);

  function back() {
    if (screen === "note-form") setScreen("notes");
    else if (screen === "new-document") setScreen("documents");
    else if (screen === "new-photo" || screen === "compare") setScreen("photos");
    else setScreen(initialView);
  }

  return (
    <>
    <SidePanel eyebrow={`${customer.name} · uso interno`} title={TITLES[screen]} close={close} wide>
      {screen !== "notes" && screen !== "documents" && screen !== "photos" && screen !== "payments" ? (
        <button type="button" className="back-link panel-back" onClick={back}>
          ← Voltar
        </button>
      ) : null}

      {formError ? <p className="form-error">{formError}</p> : null}

      {screen === "notes" && (
        <div className="records-content">
          <div className="records-actions">
            <button
              type="button"
              className="primary-button primary-button-link"
              onClick={() => {
                setEditingNote(null);
                setScreen("note-form");
              }}
            >
              + Adicionar nota
            </button>
          </div>
          {notesLoading ? (
            <p className="page-status">Carregando…</p>
          ) : notes.length === 0 ? (
            <p className="procedure-empty">Nenhuma nota registrada.</p>
          ) : (
            <div className="notes-list">
              {notes.map((note) => (
                <article key={note.id}>
                  <div className="note-meta">
                    <span className="section-meta">{formatLongDate(note.createdAt)}</span>
                    <span className="section-meta">{note.author}</span>
                  </div>
                  <h3 className="note-title">{note.title}</h3>
                  <p>{note.content}</p>
                  <div className="note-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setEditingNote(note);
                        setScreen("note-form");
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-button is-danger"
                      onClick={async () => {
                        const updated = await deleteNote(customer.id, note.id);
                        setNotes(updated);
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "note-form" && (
        <NoteForm
          note={editingNote}
          saving={saving}
          onSave={async (title, content) => {
            setSaving(true);
            setFormError(null);
            try {
              const updated = editingNote
                ? await updateNote(customer.id, editingNote.id, { title, content })
                : await createNote(customer.id, { title, content });
              setNotes(updated);
              setSaving(false);
              setScreen("notes");
            } catch (err) {
              setSaving(false);
              setFormError(err instanceof Error ? err.message : "Não foi possível salvar.");
            }
          }}
        />
      )}

      {screen === "documents" && (
        <div className="records-content">
          <div className="records-actions">
            <button
              type="button"
              className="primary-button primary-button-link"
              onClick={() => setScreen("new-document")}
            >
              + Adicionar documento
            </button>
          </div>
          {documentsLoading ? (
            <p className="page-status">Carregando…</p>
          ) : documents.length === 0 ? (
            <p className="procedure-empty">Nenhum documento registrado.</p>
          ) : (
            <div className="record-events">
              {documents.map((doc) => (
                <section key={doc.id}>
                  <div className="record-date">
                    <span className="section-meta">{formatLongDate(doc.createdAt)}</span>
                    <h3 className="note-title">{DOCUMENT_TYPE_LABELS[doc.type]}</h3>
                    <span className="section-meta">
                      {doc.procedureName ?? "Sem procedimento vinculado"}
                    </span>
                  </div>
                  <div className="record-documents">
                    <div>
                      <span className={doc.status === "SIGNED" ? "active-badge is-active" : "active-badge"}>
                        {doc.status === "SIGNED" ? "Assinado" : "Aguardando assinatura"}
                      </span>
                      {doc.signedBy ? (
                        <span className="section-meta">
                          {doc.signedBy}
                          {doc.signedAt ? `, ${formatDateTime(doc.signedAt)}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <a
                      className="section-link"
                      href={`${import.meta.env.VITE_API_BASE_URL}${doc.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir PDF →
                    </a>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "new-document" && (
        <NewDocumentForm
          saving={saving}
          procedureOptions={procedureOptions}
          appointmentOptions={appointmentOptions}
          onSave={async (input) => {
            setSaving(true);
            setFormError(null);
            try {
              const updated = await uploadDocument(customer.id, input);
              setDocuments(updated);
              setSaving(false);
              setScreen("documents");
            } catch (err) {
              setSaving(false);
              setFormError(err instanceof Error ? err.message : "Não foi possível enviar o PDF.");
            }
          }}
        />
      )}

      {screen === "photos" && (
        <div className="records-content">
          <div className="records-actions">
            {photos.length >= 2 ? (
              <button type="button" className="secondary-button" onClick={() => setScreen("compare")}>
                Comparar evolução
              </button>
            ) : null}
            <button
              type="button"
              className="primary-button primary-button-link"
              onClick={() => setScreen("new-photo")}
            >
              + Adicionar fotos
            </button>
          </div>
          {photosLoading ? (
            <p className="page-status">Carregando…</p>
          ) : photos.length === 0 ? (
            <p className="procedure-empty">Nenhuma foto registrada.</p>
          ) : (
            <div className="photo-grid">
              {photos.map((photo) => (
                <figure key={photo.id}>
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL}${photo.fileUrl}`}
                    alt={photo.label ? PHOTO_LABEL_LABELS[photo.label] : "Registro fotográfico"}
                  />
                  <figcaption>
                    {formatLongDate(photo.createdAt)}
                    {photo.label ? ` · ${PHOTO_LABEL_LABELS[photo.label]}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "new-photo" && (
        <NewPhotoForm
          saving={saving}
          procedureOptions={procedureOptions}
          onSave={async (files, label, note) => {
            setSaving(true);
            setFormError(null);
            try {
              let updated = photos;
              for (const file of files) {
                updated = await uploadPhoto(customer.id, { file, label, note });
              }
              setPhotos(updated);
              setSaving(false);
              setScreen("photos");
            } catch (err) {
              setSaving(false);
              setFormError(err instanceof Error ? err.message : "Não foi possível enviar as fotos.");
            }
          }}
        />
      )}

      {screen === "compare" && <ComparePhotos photos={photos} />}

      {screen === "payments" && (
        <div className="records-content">
          {salesLoading ? (
            <p className="page-status">Carregando…</p>
          ) : sales.length === 0 ? (
            <p className="procedure-empty">Nenhuma venda registrada.</p>
          ) : (
            <div className="payments-history">
              {sales.map((sale) => (
                <div className="detail-line" key={sale.id}>
                  <span className="section-meta">{formatLongDate(sale.createdAt)}</span>
                  <b>{formatPrice(sale.total)}</b>
                  <span
                    className={sale.status === "PAID" ? "active-badge is-active" : "active-badge"}
                  >
                    {SALE_STATUS_LABELS[sale.status]}
                  </span>
                  <button
                    type="button"
                    className="section-link"
                    onClick={() => getSale(sale.id).then(setOpenSale)}
                  >
                    Ver venda →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SidePanel>

    {openSale ? (
      <SaleDetailPanel
        sale={openSale}
        close={() => setOpenSale(null)}
        cancelling={cancelling}
        onRegisterPayment={() => setShowPaymentPanel(true)}
        onCancel={async () => {
          const reason=window.prompt("Motivo do cancelamento da venda");if(!reason)return;
          setCancelling(true);
          const updated = await cancelSale(openSale.id,reason);
          setCancelling(false);
          setOpenSale(updated);
          reloadSales();
        }}
      />
    ) : null}

    {openSale && showPaymentPanel ? (
      <PaymentPanel
        balance={openSale.balance}
        saving={saving}
        close={() => setShowPaymentPanel(false)}
        save={async (amount: number, method: PaymentMethod, installments: number | null,requestKey:string) => {
          setSaving(true);
          const updated = await registerSalePayment(openSale.id, { amount, method, installments,requestKey });
          setSaving(false);
          setOpenSale(updated);
          setShowPaymentPanel(false);
          reloadSales();
        }}
      />
    ) : null}
    </>
  );
}

function NoteForm({
  note,
  saving,
  onSave,
}: {
  note: CustomerNote | null;
  saving: boolean;
  onSave: (title: string, content: string) => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");

  return (
    <div className="records-content">
      <div className="record-form">
        <label className="field">
          Título
          <input
            className="text-input"
            value={title}
            placeholder="Identifique a nota"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          Nota
          <textarea
            className="textarea-input"
            rows={8}
            value={content}
            placeholder="Registre uma observação interna sobre o cliente"
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <p className="section-meta">Notas são internas e ficam disponíveis para a equipe da clínica.</p>
        <button
          type="button"
          className="primary-button primary-button-link"
          disabled={!title.trim() || !content.trim() || saving}
          onClick={() => onSave(title.trim(), content.trim())}
        >
          {saving ? "Salvando…" : note ? "Salvar alterações" : "Adicionar nota"}
        </button>
      </div>
    </div>
  );
}

function NewDocumentForm({
  saving,
  procedureOptions,
  appointmentOptions,
  onSave,
}: {
  saving: boolean;
  procedureOptions: { id: number; name: string }[];
  appointmentOptions: { id: number; procedureName: string; startsAt: string }[];
  onSave: (input: {
    file: File;
    type: DocumentType;
    status: DocumentStatus;
    procedureId?: number;
    appointmentId?: number;
    signedBy?: string;
    signedAt?: string;
    note?: string;
  }) => void;
}) {
  const [type, setType] = useState<DocumentType>("ANAMNESIS");
  const [status, setStatus] = useState<DocumentStatus>("AWAITING_SIGNATURE");
  const [procedureId, setProcedureId] = useState<number | "">("");
  const [appointmentId, setAppointmentId] = useState<number | "">("");
  const [signedBy, setSignedBy] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="records-content">
      <div className="record-form">
        <div className="field-grid">
          <label className="field">
            Tipo de documento
            <select className="select-input" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
              <option value="ANAMNESIS">Anamnese</option>
              <option value="CONTRACT">Contrato / termo</option>
              <option value="OTHER">Outro documento</option>
            </select>
          </label>
          <label className="field">
            Procedimento relacionado
            <select
              className="select-input"
              value={procedureId}
              onChange={(e) => setProcedureId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Sem procedimento relacionado</option>
              {procedureOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Atendimento relacionado
          <select
            className="select-input"
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Sem atendimento relacionado</option>
            {appointmentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {formatDateTime(a.startsAt)} · {a.procedureName}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status da assinatura
          <select
            className="select-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as DocumentStatus)}
          >
            <option value="AWAITING_SIGNATURE">Aguardando assinatura</option>
            <option value="SIGNED">Assinado digitalmente</option>
          </select>
        </label>
        {status === "SIGNED" ? (
          <label className="field">
            Assinado por
            <input className="text-input" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
          </label>
        ) : null}
        <label className="field pdf-drop">
          Arquivo PDF
          <input
            className="text-input"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="field">
          Observação · opcional
          <input className="text-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          type="button"
          className="primary-button primary-button-link"
          disabled={!file || saving}
          onClick={() =>
            file &&
            onSave({
              file,
              type,
              status,
              procedureId: procedureId || undefined,
              appointmentId: appointmentId || undefined,
              signedBy: signedBy || undefined,
              signedAt: status === "SIGNED" ? new Date().toISOString() : undefined,
              note: note || undefined,
            })
          }
        >
          {saving ? "Enviando…" : "Adicionar PDF"}
        </button>
      </div>
    </div>
  );
}

function NewPhotoForm({
  saving,
  procedureOptions,
  onSave,
}: {
  saving: boolean;
  procedureOptions: { id: number; name: string }[];
  onSave: (files: File[], label: PhotoLabel | undefined, note: string | undefined) => void;
}) {
  const [label, setLabel] = useState<PhotoLabel | "">("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="records-content">
      <div className="record-form">
        <label className="field">
          Procedimento
          <select className="select-input" disabled={procedureOptions.length === 0}>
            {procedureOptions.map((p) => (
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Identificação das fotos
          <select className="select-input" value={label} onChange={(e) => setLabel(e.target.value as PhotoLabel)}>
            <option value="">Sem identificação</option>
            {(Object.entries(PHOTO_LABEL_LABELS) as [PhotoLabel, string][]).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label className="field pdf-drop">
          Imagens
          <input
            className="text-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <span className="section-meta">{files.length} selecionada(s)</span>
        </label>
        <label className="field">
          Observação · opcional
          <input className="text-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          type="button"
          className="primary-button primary-button-link"
          disabled={files.length === 0 || saving}
          onClick={() => onSave(files, label || undefined, note || undefined)}
        >
          {saving ? "Enviando…" : "Salvar fotos"}
        </button>
      </div>
    </div>
  );
}

function ComparePhotos({ photos }: { photos: CustomerPhoto[] }) {
  const [idA, setIdA] = useState(photos[0]?.id);
  const [idB, setIdB] = useState(photos[1]?.id);
  const photoA = photos.find((p) => p.id === idA);
  const photoB = photos.find((p) => p.id === idB);

  return (
    <div className="records-content">
      <div className="compare-grid">
        {[
          { label: "Foto A", value: idA, setValue: setIdA, photo: photoA },
          { label: "Foto B", value: idB, setValue: setIdB, photo: photoB },
        ].map((item) => (
          <div key={item.label}>
            <label className="field">
              {item.label}
              <select
                className="select-input"
                value={item.value}
                onChange={(e) => item.setValue(Number(e.target.value))}
              >
                {photos.map((photo) => (
                  <option key={photo.id} value={photo.id}>
                    {formatLongDate(photo.createdAt)}
                    {photo.label ? ` · ${PHOTO_LABEL_LABELS[photo.label]}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {item.photo ? (
              <img
                src={`${import.meta.env.VITE_API_BASE_URL}${item.photo.fileUrl}`}
                alt={item.label}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
