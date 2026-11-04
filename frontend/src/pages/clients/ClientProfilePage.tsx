import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCustomer,
  getCustomerSales,
  getDocuments,
  getNotes,
  getPhotos,
  updateCustomer,
  type AcquisitionSource,
  type CustomerDetail,
} from "../../lib/api";
import { appointmentStatusInfo } from "../../lib/appointmentStatus";
import { formatDateTime, formatLongDate } from "../../lib/format";
import { ClientRecordsPanel } from "./ClientRecordsPanel";
import "../../styles/appointment-list.css";
import "./ClientProfilePage.css";

type RecordsView = "notes" | "documents" | "photos" | "payments";

const SOURCES: { value: AcquisitionSource; label: string }[] = [
  { value: "INDICACAO", label: "Indicação" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "GOOGLE", label: "Google" },
  { value: "OUTRO", label: "Outros" },
];

export function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recordsView, setRecordsView] = useState<RecordsView | null>(null);
  const [counts, setCounts] = useState({ notes: 0, documents: 0, photos: 0, sales: 0 });

  interface FormState {
    name: string;
    phone: string;
    email: string;
    birthDate: string;
    acquisitionSource: AcquisitionSource;
  }

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    birthDate: "",
    acquisitionSource: "INDICACAO",
  });

  function toForm(detail: CustomerDetail): FormState {
    return {
      name: detail.name,
      phone: detail.phone,
      email: detail.email ?? "",
      birthDate: detail.birthDate ?? "",
      acquisitionSource: detail.acquisitionSource,
    };
  }

  useEffect(() => {
    let cancelled = false;
    getCustomer(customerId)
      .then((detail) => {
        if (!cancelled) {
          setCustomer(detail);
          setForm(toForm(detail));
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    if (recordsView !== null) return;
    let cancelled = false;
    Promise.all([
      getNotes(customerId),
      getDocuments(customerId),
      getPhotos(customerId),
      getCustomerSales(customerId),
    ])
      .then(([notes, documents, photos, sales]) => {
        if (!cancelled) {
          setCounts({
            notes: notes.length,
            documents: documents.length,
            photos: photos.length,
            sales: sales.length,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [customerId, recordsView]);

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      setSaveError("Nome e telefone são obrigatórios.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateCustomer(customerId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() ? form.email.trim() : null,
        birthDate: form.birthDate || null,
        acquisitionSource: form.acquisitionSource,
      });
      setCustomer(updated);
      setForm(toForm(updated));
      setSaving(false);
      setEditing(false);
    } catch (err) {
      setSaving(false);
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  if (loading) {
    return <p className="page-status">Carregando…</p>;
  }

  if (error || !customer) {
    return <p className="page-status">Não foi possível carregar o cliente.</p>;
  }

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate("/clientes")}>
        ← Todos os clientes
      </button>

      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Perfil do cliente</p>
          <h1 className="page-header-title">{customer.name}</h1>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={() => (editing ? handleSave() : setEditing(true))}
          >
            {saving ? "Salvando…" : editing ? "Salvar alterações" : "Editar cliente"}
          </button>
          <button type="button" className="primary-button" aria-disabled="true">
            Novo agendamento
          </button>
        </div>
      </header>

      {saveError ? <p className="form-error">{saveError}</p> : null}

      {editing ? (
        <div className="field-grid profile-edit-grid">
          <label className="field">
            Nome
            <input
              className="text-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="field">
            Telefone
            <input
              className="text-input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="field">
            E-mail
            <input
              className="text-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="field">
            Nascimento
            <input
              className="text-input"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
            />
          </label>
          <label className="field">
            Origem
            <select
              className="select-input"
              value={form.acquisitionSource}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  acquisitionSource: e.target.value as AcquisitionSource,
                }))
              }
            >
              {SOURCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="profile-facts">
          <div>
            <span className="section-meta">Telefone</span>
            <b>{customer.phone}</b>
          </div>
          <div>
            <span className="section-meta">Nascimento</span>
            <b>{customer.birthDate ? formatLongDate(customer.birthDate) : "—"}</b>
          </div>
          <div>
            <span className="section-meta">Origem</span>
            <b>{customer.acquisitionSourceLabel}</b>
          </div>
          <div>
            <span className="section-meta">Cliente desde</span>
            <b>{formatLongDate(customer.createdAt)}</b>
          </div>
        </div>
      )}

      <section className="profile-next">
        <div className="section-header">
          <span className="section-label">Próximo agendamento</span>
        </div>
        {customer.nextAppointment ? (
          <div className="next-appointment">
            <div>
              <strong className="display next-appointment-day">
                {new Date(customer.nextAppointment.startsAt).getDate()}
              </strong>
              <span className="section-meta">
                {new Date(customer.nextAppointment.startsAt).toLocaleDateString("pt-BR", {
                  month: "long",
                })}
              </span>
            </div>
            <div>
              <span className="section-meta">Horário</span>
              <b>{formatDateTime(customer.nextAppointment.startsAt).split(", ")[1]}</b>
            </div>
            <div>
              <span className="section-meta">Procedimento</span>
              <b>{customer.nextAppointment.procedureName}</b>
            </div>
            <div>
              <span className="section-meta">Profissional</span>
              <b>{customer.nextAppointment.professionalName}</b>
            </div>
            <span className={`status-dot ${appointmentStatusInfo(customer.nextAppointment.status).dotClass}`} />
          </div>
        ) : (
          <p className="procedure-empty">Nenhum agendamento futuro.</p>
        )}
      </section>

      <div className="profile-grid">
        <section>
          <div className="section-header">
            <span className="section-label">Histórico</span>
            <span className="section-meta">{customer.history.length} atendimentos</span>
          </div>
          <div className="history-list">
            {customer.history.length === 0 ? (
              <p className="procedure-empty">Nenhum atendimento registrado ainda.</p>
            ) : (
              customer.history.map((item) => {
                const status = appointmentStatusInfo(item.status);
                return (
                  <div className="history-row" key={item.id}>
                    <span className="section-meta">{formatLongDate(item.startsAt)}</span>
                    <div>
                      <b>{item.procedureName}</b>
                      <p className="client-row-sub">{item.professionalName}</p>
                    </div>
                    <span className="agenda-status">
                      <span className={`status-dot ${status.dotClass}`} />
                      {status.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
        <aside className="future">
          <div className="section-header">
            <span className="section-label">Relacionamento</span>
          </div>
          {(
            [
              { title: "Notas", detail: `${counts.notes} notas internas`, view: "notes" as const },
              {
                title: "Anamneses e contratos",
                detail: `${counts.documents} registros documentais`,
                view: "documents" as const,
              },
              {
                title: "Fotos de evolução",
                detail: `${counts.photos} fotografias`,
                view: "photos" as const,
              },
              {
                title: "Pagamentos",
                detail: `${counts.sales} vendas relacionadas`,
                view: "payments" as const,
              },
            ]
          ).map((item) => (
            <button
              type="button"
              className="relationship-link"
              key={item.title}
              onClick={() => setRecordsView(item.view)}
            >
              <span>
                <b>{item.title}</b>
                <small>{item.detail}</small>
              </span>
              <i>Ver →</i>
            </button>
          ))}
        </aside>
      </div>

      {recordsView ? (
        <ClientRecordsPanel
          customer={customer}
          initialView={recordsView}
          close={() => setRecordsView(null)}
        />
      ) : null}
    </div>
  );
}
