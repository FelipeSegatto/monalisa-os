import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createProfessional,
  createProfessionalAccount,
  getProfessional,
  getProfessionalAccount,
  updateProfessional,
  type ProfessionalAccount,
  type ProfessionalDetail,
} from "../../lib/api";

interface Props {
  isNew?: boolean;
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  color: string;
  active: boolean;
}

const DEFAULT_COLOR = "#876444";

function toForm(detail: ProfessionalDetail): FormState {
  return {
    name: detail.name,
    phone: detail.phone ?? "",
    email: detail.email ?? "",
    color: detail.color,
    active: detail.active,
  };
}

export function ProfessionalDetailPage({ isNew = false }: Props) {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const professionalId = isNew ? null : Number(params.id);

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    color: DEFAULT_COLOR,
    active: true,
  });
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [account, setAccount] = useState<ProfessionalAccount | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);

  useEffect(() => {
    if (isNew || !professionalId) return;
    let cancelled = false;
    getProfessional(professionalId)
      .then((detail) => {
        if (!cancelled) {
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
    getProfessionalAccount(professionalId)
      .then((data) => {
        if (!cancelled) {
          setAccount(data);
          setAccountEmail(data.email ?? "");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isNew, professionalId]);

  async function handleSaveAccount() {
    if (!professionalId) return;
    if (!accountEmail.trim()) {
      setAccountError("E-mail é obrigatório.");
      return;
    }
    if (accountPassword.length < 6) {
      setAccountError("Senha deve ter ao menos 6 caracteres.");
      return;
    }
    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(false);
    try {
      const saved = await createProfessionalAccount(professionalId, {
        email: accountEmail.trim(),
        password: accountPassword,
      });
      setAccount(saved);
      setAccountPassword("");
      setAccountSuccess(true);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Não foi possível salvar o acesso.");
    } finally {
      setAccountSaving(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const input = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      color: form.color || null,
      active: form.active,
    };
    try {
      const saved = isNew
        ? await createProfessional(input)
        : await updateProfessional(professionalId as number, input);
      setSaving(false);
      navigate(`/profissionais/${saved.id}`, { replace: true });
    } catch (err) {
      setSaving(false);
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  if (loading) {
    return <p className="page-status">Carregando…</p>;
  }

  if (error) {
    return <p className="page-status">Não foi possível carregar o profissional.</p>;
  }

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate("/profissionais")}>
        ← Todos os profissionais
      </button>

      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Equipe</p>
          <h1 className="page-header-title">{isNew ? "Novo profissional" : form.name || "—"}</h1>
        </div>
        <button
          type="button"
          className="primary-button primary-button-link"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </header>

      {saveError ? <p className="form-error">{saveError}</p> : null}

      <div className="field-grid">
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
          Cor de identificação
          <input
            className="text-input"
            type="color"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          />
        </label>
        <label className="field">
          Status
          <select
            className="select-input"
            value={form.active ? "true" : "false"}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "true" }))}
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </label>
      </div>

      {!isNew ? (
        <>
          <div className="section-header">
            <span className="section-label">Acesso ao sistema</span>
          </div>
          {account?.hasAccount ? (
            <p className="section-meta">
              Este profissional já tem login de funcionário com o e-mail <strong>{account.email}</strong>.
              Para trocar o e-mail ou a senha, preencha os campos abaixo.
            </p>
          ) : (
            <p className="section-meta">
              Este profissional ainda não tem login de funcionário. Crie um e-mail e senha para que
              ele possa acessar o sistema.
            </p>
          )}

          {accountError ? <p className="form-error">{accountError}</p> : null}
          {accountSuccess ? <p className="section-meta">Acesso salvo com sucesso.</p> : null}

          <div className="field-grid">
            <label className="field">
              E-mail de acesso
              <input
                className="text-input"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
              />
            </label>
            <label className="field">
              {account?.hasAccount ? "Nova senha" : "Senha"}
              <input
                className="text-input"
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled={accountSaving}
            onClick={handleSaveAccount}
          >
            {accountSaving ? "Salvando…" : account?.hasAccount ? "Atualizar acesso" : "Criar acesso"}
          </button>
        </>
      ) : null}
    </div>
  );
}
