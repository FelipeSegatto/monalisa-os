import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createFreeBooking, createPublicLead, getBookingSlots, type ProcedureCategory } from "../../lib/api";
import { CLINIC_WHATSAPP } from "../../config/clinic";
import "./BookingModal.css";

type Step = "contact" | "schedule" | "done-free" | "lead-sent";

interface Props {
  categories: ProcedureCategory[];
  initialCategoryName?: string | null;
  onClose: () => void;
}

function whatsappHref(message: string): string {
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function todayKey(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function maxDateKey(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function BookingModal({ categories, initialCategoryName = null, onClose }: Props) {
  const [step, setStep] = useState<Step>("contact");
  const dialogRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);

  const [date, setDate] = useState(todayKey());
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [time, setTime] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "schedule") return;
    let cancelled = false;
    getBookingSlots(date)
      .then((result) => {
        if (!cancelled) {
          setSlots(result);
          setSlotsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setSlotsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step, date]);

  useEffect(() => {
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function startsAtIso(): string {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  function handleContactSubmit() {
    if (!name.trim() || !phone.trim()) {
      setContactError("Nome e telefone são obrigatórios.");
      return;
    }
    setContactError(null);
    setStep("schedule");
  }

  async function handlePreferContactOnly() {
    if (!name.trim() || !phone.trim()) {
      setContactError("Nome e telefone são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const categoryId = initialCategoryName
        ? categories.find((c) => c.name === initialCategoryName)?.id ?? null
        : null;
      await createPublicLead({
        name: name.trim(),
        phone: phone.trim(),
        procedureCategoryId: categoryId,
        message: null,
      });
      setStep("lead-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFreeBooking() {
    if (!time) return;
    setSubmitting(true);
    setError(null);
    try {
      await createFreeBooking({ name: name.trim(), phone: phone.trim(), startsAt: startsAtIso() });
      setStep("done-free");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível agendar.");
      // Atualiza os horários: alguém pode ter reservado este intervalo.
      try {
        const updatedSlots = await getBookingSlots(date);
        setSlots(updatedSlots);
      } catch { /* Mantém o erro principal visível ao usuário. */ }
    } finally {
      setSubmitting(false);
    }
  }

  const scheduledLabel = time ? `${date.split("-").reverse().join("/")} às ${time}` : "";

  return createPortal(
    <div className="booking-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Agendar avaliação"
        tabIndex={-1}
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="booking-modal-head">
          <span className="booking-modal-eyebrow">Agendar avaliação</span>
          <button type="button" className="booking-modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {(step === "contact" || step === "schedule") && (
          <nav className="booking-modal-steps" aria-hidden="true">
            {["Dados", "Horário"].map((label, index) => {
              const stepIndex = step === "contact" ? 0 : 1;
              return (
                <span key={label} className={index <= stepIndex ? "is-active" : ""}>
                  {label}
                </span>
              );
            })}
          </nav>
        )}

        <div className="booking-modal-body">
          {error ? <p className="form-error">{error}</p> : null}

          {step === "contact" && (
            <div className="booking-modal-step">
              <h3 className="booking-modal-title">Vamos começar</h3>
              <p className="booking-modal-text">
                Conte pra gente quem é você para encontrarmos o melhor horário.
              </p>
              {contactError ? <p className="form-error">{contactError}</p> : null}
              <label className="field">
                Nome
                <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                Telefone / WhatsApp
                <input className="text-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <div className="booking-modal-actions">
                <button type="button" className="primary-button primary-button-link" onClick={handleContactSubmit}>
                  Continuar
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={submitting}
                  onClick={handlePreferContactOnly}
                >
                  Prefiro só deixar meu contato
                </button>
              </div>
            </div>
          )}

          {step === "schedule" && (
            <div className="booking-modal-step">
              <h3 className="booking-modal-title">Escolha o dia e o horário</h3>
              <p className="booking-modal-text">A avaliação é gratuita.</p>
              <label className="field">
                Dia
                <input
                  className="text-input"
                  type="date"
                  min={todayKey()}
                  max={maxDateKey()}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime(null);
                  }}
                />
              </label>
              <div className="booking-modal-slots">
                {slotsLoading ? <p className="booking-modal-text">Carregando horários…</p> : null}
                {!slotsLoading && slots.length === 0 ? (
                  <p className="booking-modal-text">Sem horários livres nesse dia. Tente outra data.</p>
                ) : null}
                {!slotsLoading &&
                  slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`booking-modal-slot${time === slot ? " is-selected" : ""}`}
                      onClick={() => setTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
              </div>
              <div className="booking-modal-actions">
                <button type="button" className="text-button" onClick={() => setStep("contact")}>
                  Voltar
                </button>
                <button
                  type="button"
                  className="primary-button primary-button-link"
                  disabled={!time || submitting}
                  onClick={handleFreeBooking}
                >
                  {submitting ? "Agendando…" : "Agendar avaliação"}
                </button>
              </div>
            </div>
          )}

          {step === "done-free" && (
            <div className="booking-modal-step booking-modal-step--done">
              <h3 className="booking-modal-title">Avaliação agendada!</h3>
              <p className="booking-modal-text">
                Combinamos para {scheduledLabel}. Nossa equipe vai confirmar com você antes do dia.
              </p>
              <a
                className="secondary-button"
                href={whatsappHref("Olá! Acabei de agendar minha avaliação pelo site.")}
                target="_blank"
                rel="noreferrer"
              >
                Falar no WhatsApp
              </a>
            </div>
          )}

          {step === "lead-sent" && (
            <div className="booking-modal-step booking-modal-step--done">
              <h3 className="booking-modal-title">Recebemos seu contato.</h3>
              <p className="booking-modal-text">Nossa equipe retorna em breve para confirmar sua avaliação.</p>
              <a
                className="secondary-button"
                href={whatsappHref("Olá! Quero agendar uma avaliação.")}
                target="_blank"
                rel="noreferrer"
              >
                Falar no WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
