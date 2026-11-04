import { useState } from "react";
import { useLeads } from "./hooks/useLeads";
import { setLeadStatus, type Lead } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import "./LeadsPage.css";

const STATUS_LABEL: Record<Lead["status"], string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
};

export function LeadsPage() {
  const { data, loading, error, reload } = useLeads();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function handleMarkContacted(lead: Lead) {
    setUpdatingId(lead.id);
    try {
      await setLeadStatus(lead.id, "CONTACTED");
      reload();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Catálogo público</p>
          <h1 className="page-header-title">Leads</h1>
        </div>
      </header>

      {loading ? <p className="page-status">Carregando…</p> : null}
      {error ? <p className="page-status">Não foi possível carregar os leads.</p> : null}

      {data ? (
        <>
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>Contato</span>
              <span>Procedimento de interesse</span>
              <span>Recebido em</span>
              <span>Status</span>
              <span />
            </div>
            {data.map((lead) => (
              <div className="lead-row" key={lead.id}>
                <div>
                  <span className="row-title">{lead.name}</span>
                  <p className="client-row-sub">
                    {lead.phone}
                    {lead.message ? ` · ${lead.message}` : ""}
                  </p>
                </div>
                <span>{lead.procedureCategoryName ?? "—"}</span>
                <span>{formatDateTime(lead.createdAt)}</span>
                <span className={lead.status === "NEW" ? "active-badge is-active" : "active-badge"}>
                  {STATUS_LABEL[lead.status]}
                </span>
                {lead.status === "NEW" ? (
                  <button
                    type="button"
                    className="text-button"
                    disabled={updatingId === lead.id}
                    onClick={() => handleMarkContacted(lead)}
                  >
                    Marcar contatado
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
          <div className="list-footer">{data.length} leads recebidos</div>
        </>
      ) : null}
    </div>
  );
}
