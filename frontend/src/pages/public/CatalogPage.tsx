import { useMemo, useRef, useState } from "react";
import { usePublicCatalog } from "./hooks/usePublicCatalog";
import { flattenCatalog } from "./catalogItems";
import { Hero } from "./Hero";
import { MiddleSection } from "./MiddleSection";
import { CatalogCarousel } from "./CatalogCarousel";
import { Booklet } from "./Booklet";
import { BookingModal } from "./BookingModal";
import { CLINIC_INSTAGRAM, CLINIC_NAME, CLINIC_WHATSAPP } from "../../config/clinic";
import heroImage from "../../assets/catalog-hero.jpg";
import "./catalog.css";

function whatsappHref(message: string): string {
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function CatalogPage() {
  const { categories, loading, error } = usePublicCatalog();
  const items = useMemo(() => flattenCatalog(categories), [categories]);

  const [bookletIndex, setBookletIndex] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState<{ open: boolean; categoryName?: string }>({
    open: false,
  });
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [year] = useState(() => new Date().getFullYear());

  function openBooklet(index: number, trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setBookletIndex(index);
  }

  return (
    <div className="pubcat-page">
      <header className="pubcat-nav">
        <nav className="pubcat-nav-links">
          <a href="#catalogo">
            <span className="pubcat-nav-label-full">Procedimentos</span>
            <span className="pubcat-nav-label-short">Catálogo</span>
          </a>
          <a className="pubcat-nav-link-contact" href="#agendar">
            Contato
          </a>
        </nav>
        <p className="pubcat-brand">{CLINIC_NAME}</p>
        <button
          type="button"
          className="pubcat-nav-cta"
          onClick={() => setBookingModal({ open: true })}
        >
          <span className="pubcat-nav-cta-full">Agendar avaliação</span>
          <span className="pubcat-nav-cta-short">Agendar</span>
        </button>
      </header>

      <Hero heroImageSrc={heroImage} />

      <MiddleSection />

      {loading ? <p className="pubcat-status">Carregando catálogo…</p> : null}
      {error ? <p className="pubcat-status">Não foi possível carregar o catálogo.</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="pubcat-status">Nenhum procedimento disponível no momento.</p>
      ) : null}

      {items.length > 0 ? (
        <CatalogCarousel items={items} onOpen={openBooklet} />
      ) : null}

      <section id="agendar" className="pubcat-footer">
        <div className="pubcat-footer-top">
          <h2>Precisão, naturalidade e atenção em cada escolha.</h2>
          <div className="pubcat-footer-actions">
            <button
              type="button"
              className="pubcat-footer-button pubcat-footer-button--solid"
              onClick={() => setBookingModal({ open: true })}
            >
              Agendar avaliação
            </button>
            <a
              className="pubcat-footer-button pubcat-footer-button--outline"
              href={whatsappHref("Olá! Quero agendar uma avaliação.")}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <div className="pubcat-footer-bottom">
          <span className="pubcat-footer-brand">{CLINIC_NAME}</span>
          <div className="pubcat-footer-social">
            <a href={`https://instagram.com/${CLINIC_INSTAGRAM}`} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href={whatsappHref("Olá!")} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
          <span className="pubcat-footer-copyright">© {year}</span>
        </div>
      </section>

      {bookletIndex !== null && items[bookletIndex] ? (
        <Booklet
          items={items}
          activeIndex={bookletIndex}
          onClose={() => setBookletIndex(null)}
          onChangeItem={setBookletIndex}
          onOpenLeadForm={(categoryName) => setBookingModal({ open: true, categoryName })}
          whatsappHref={whatsappHref}
          returnFocusRef={returnFocusRef}
        />
      ) : null}

      {bookingModal.open ? (
        <BookingModal
          categories={categories}
          initialCategoryName={bookingModal.categoryName ?? null}
          onClose={() => setBookingModal({ open: false })}
        />
      ) : null}
    </div>
  );
}
