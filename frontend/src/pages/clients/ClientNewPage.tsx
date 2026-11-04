import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCustomer, type AcquisitionSource } from "../../lib/api";

const SOURCES: { value: AcquisitionSource; label: string }[] = [
  { value: "INDICACAO", label: "Indicação" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "GOOGLE", label: "Google" },
  { value: "OUTRO", label: "Outros" },
];

export function ClientNewPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState<AcquisitionSource>("INDICACAO");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      setError("Nome e telefone são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const customer = await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() ? email.trim() : null,
        birthDate: birthDate || null,
        acquisitionSource,
      });
      navigate(`/clientes/${customer.id}`, { replace: true });
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate("/clientes")}>
        ← Todos os clientes
      </button>

      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Relacionamento</p>
          <h1 className="page-header-title">Novo cliente</h1>
        </div>
        <button
          type="button"
          className="primary-button primary-button-link"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Salvando…" : "Salvar cliente"}
        </button>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="field-grid">
        <label className="field">
          Nome
          <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Telefone
          <input
            className="text-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 90000-0000"
          />
        </label>
        <label className="field">
          E-mail · opcional
          <input
            className="text-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          Nascimento · opcional
          <input
            className="text-input"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>
        <label className="field">
          Origem
          <select
            className="select-input"
            value={acquisitionSource}
            onChange={(e) => setAcquisitionSource(e.target.value as AcquisitionSource)}
          >
            {SOURCES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
