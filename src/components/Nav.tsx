import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useBooking } from '../context/BookingContext';
import { useAccount } from '../context/AccountContext';
import { avatarFor } from '../data/avatars';
import styles from './Nav.module.css';

export function Nav() {
  const { openBook } = useBooking();
  const { user, openAccount, setView, logout } = useAccount();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const avatar = avatarFor(user?.avatar ?? 'heart');
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => { if (!accountRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menuOpen]);
  const handleBookNow = (event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); setMenuOpen(false); openBook(null); };
  const openPanel = (view: 'profile' | 'appointments') => { setMenuOpen(false); triggerRef.current?.focus(); setView(view); };
  return (
    <nav className={styles.nav} aria-label="Navegação principal">
      <div className={styles.links}>
        <a href="#sobre" className={`${styles.link} ${styles.linkAbout}`}>Sobre a monalisa</a>
        <a href="#agendar" className={`${styles.link} ${styles.linkBookNow}`} onClick={handleBookNow}>BOOK NOW</a>
        <a href="#catalogo" className={`${styles.link} ${styles.linkCatalogue}`}>Catálogo</a>
      </div>
      <div className={styles.right}>
        <div ref={accountRef} className={styles.account}>
          <button ref={triggerRef} type="button" className={styles.heartButton} aria-label="Minha conta" title="Minha conta" aria-expanded={user ? menuOpen : undefined} aria-controls={user && menuOpen ? 'account-options' : undefined} onClick={() => user ? setMenuOpen(!menuOpen) : openAccount()} style={user ? { background: avatar.color } : undefined}>
            <img src={avatar.image} alt="" className={user ? styles.avatarIcon : styles.heartIcon} />
          </button>
          {user && menuOpen && <div id="account-options" className={styles.accountMenu}>
            <p>{user.name ? `Oi, ${user.name.trim().split(' ')[0]}` : 'Minha conta'}<span>conta demonstrativa</span></p>
            <button type="button" onClick={() => openPanel('profile')}>meu perfil</button>
            <button type="button" onClick={() => openPanel('appointments')}>meus agendamentos</button>
            <button type="button" onClick={() => { setMenuOpen(false); logout(); triggerRef.current?.focus(); }}>sair</button>
          </div>}
        </div>
        {!user && <button type="button" className={styles.signIn} onClick={openAccount}>Entrar</button>}
      </div>
    </nav>
  );
}
