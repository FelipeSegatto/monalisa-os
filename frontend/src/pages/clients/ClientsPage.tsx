import { useState } from "react";
import { Link } from "react-router-dom";
import { useCustomers } from "./hooks/useCustomers";
import { formatLongDate } from "../../lib/format";
import type { AcquisitionSource } from "../../lib/api";
import "./ClientsPage.css";

const SOURCES: { value: AcquisitionSource; label: string }[] = [
  { value: "INDICACAO", label: "Indicação" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "GOOGLE", label: "Google" },
  { value: "OUTRO", label: "Outros" },
];

export function ClientsPage() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<AcquisitionSource | null>(null);
  const { data, loading, error } = useCustomers(search, source);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Relacionamento</p>
          <h1 className="page-header-title">Clientes</h1>
        </div>
        <Link to="/clientes/novo" className="primary-button primary-button-link">
          Novo cliente
        </Link>
      </header>

      <div className="toolbar">
        <input
          className="text-input"
          aria-label="Buscar clientes"
          placeholder="Buscar por nome ou telefone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="select-input"
          aria-label="Filtrar origem"
          value={source ?? ""}
          onChange={(event) =>
            setSource(event.target.value ? (event.target.value as AcquisitionSource) : null)
          }
        >
          <option value="">Todas as origens</option>
          {SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? <p className="page-status">Carregando…</p> : null}
      {error ? <p className="page-status">Não foi possível carregar os clientes.</p> : null}

      {data ? (
        <>
          <div className="client-table">
            <div className="client-row client-row--head">
              <span>Cliente</span>
              <span>Origem</span>
              <span>Último atendimento</span>
              <span>Próximo agendamento</span>
              <span />
            </div>
            {data.map((customer) => (
              <div className="client-row" key={customer.id}>
                <div>
                  <Link to={`/clientes/${customer.id}`} className="row-title">
                    {customer.name}
                  </Link>
                  <p className="client-row-sub">
                    {customer.phone}
                    {customer.birthDate ? ` · ${formatLongDate(customer.birthDate)}` : ""}
                  </p>
                </div>
                <span>{customer.acquisitionSourceLabel}</span>
                <span>
                  {customer.lastAppointmentAt ? formatLongDate(customer.lastAppointmentAt) : "—"}
                </span>
                <span>
                  {customer.nextAppointmentAt ? formatLongDate(customer.nextAppointmentAt) : "—"}
                </span>
                <Link to={`/clientes/${customer.id}`} className="section-link">
                  Abrir →
                </Link>
              </div>
            ))}
          </div>
          <div className="list-footer">{data.length} clientes exibidos</div>
        </>
      ) : null}
    </div>
  );
}
