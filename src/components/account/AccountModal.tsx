import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAccount } from '../../context/AccountContext';
import { useBooking } from '../../context/BookingContext';
import type { AvatarId, AvatarColor } from '../../data/avatars';
import { AVATARS, AVATAR_COLORS, avatarFor } from '../../data/avatars';
import { CollageTitle } from '../CollageTitle';
import styles from './AccountModal.module.css';

const TITLES = { login: 'Entrar', signup: 'Criar conta', recover: 'Recuperar acesso', avatar: 'Seu avatar', profile: 'Minha conta', appointments: 'Agendamentos' };

export function AccountModal() {
  const { view, closeAccount } = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const isOpen = view !== null;
  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    const focus = requestAnimationFrame(() => element.querySelector<HTMLElement>('input, [data-initial-focus], button')?.focus());
    return () => {
      cancelAnimationFrame(focus);
      element.close();
      document.body.style.overflow = location.hash === '#agendar' ? 'hidden' : previousOverflow;
      const restored = trigger?.isConnected ? trigger : document.querySelector<HTMLElement>('[aria-label="Minha conta"]');
      if (restored) {
        restored.focus({ preventScroll: true });
        // This focus restore is programmatic, not a real keyboard navigation, so the
        // browser's focus-visible heuristic still lights up the ring; suppress it until
        // the element naturally loses and regains focus (e.g. a later real Tab press).
        restored.style.outline = 'none';
        const clearOverride = () => { restored.style.outline = ''; restored.removeEventListener('blur', clearOverride); };
        restored.addEventListener('blur', clearOverride, { once: true });
      }
    };
    // Keep the dialog and focus trap mounted when switching between forms.
  }, [isOpen]);
  useEffect(() => {
    if (!view) return;
    const frame = requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>('input, [data-initial-focus], [aria-pressed], button[type="submit"]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [view]);
  if (!view) return null;
  return createPortal(
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="account-title" onCancel={(event) => { event.preventDefault(); closeAccount(); }} onClick={(event) => { if (event.target === event.currentTarget) closeAccount(); }}>
      <div className={styles.sheet}>
        <header className={styles.header}>
          <span className={styles.brand}>monalisa</span>
          <button type="button" className={styles.close} aria-label="Fechar minha conta" onClick={closeAccount}>×</button>
        </header>
        <div id="account-title" className={styles.title}><CollageTitle text={TITLES[view]} fontSize="clamp(32px,5vw,46px)" baseDelay={0} as="h2" /></div>
        <p className={styles.demoNote}>Demonstração · use dados fictícios. Nenhuma conta real será criada.</p>
        <AccountContent key={view} />
      </div>
    </dialog>, document.body,
  );
}

function AccountContent() {
  const { user, view, setView, closeAccount, demoLogin, demoSignup, updateProfile, chooseAvatar } = useAccount();
  const { openBook } = useBooking();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(user?.avatar ?? 'heart');
  const [selectedColor, setSelectedColor] = useState<AvatarColor>(user?.avatarColor ?? avatarFor(user?.avatar ?? 'heart').color);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const isSignup = view === 'signup';
  const isProfile = view === 'profile';
  const hasPersonalFields = isSignup || isProfile;

  const maskPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    setPhone(digits.length > 6 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : digits.length > 2 ? `(${digits.slice(0, 2)}) ${digits.slice(2)}` : digits);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (hasPersonalFields && name.trim().length < 2) { setError('Informe como podemos te chamar.'); nameRef.current?.focus(); return; }
    if (hasPersonalFields && phone.replace(/\D/g, '').length < 10) { setError('Confira o WhatsApp com DDD.'); phoneRef.current?.focus(); return; }
    if (view === 'recover') { setMessage('Na versão completa, você receberá as instruções por e-mail. Nesta demonstração, nenhum e-mail foi enviado.'); return; }
    if (view === 'login') { demoLogin(email); return; }
    const profile = { name: name.trim(), email: email.trim().toLowerCase(), phone, avatar: user?.avatar ?? 'heart' as const, avatarColor: user?.avatarColor };
    if (isSignup) demoSignup(profile);
    else { updateProfile(profile); setMessage('Perfil da demonstração atualizado.'); }
  };

  if (view === 'avatar') return (
    <section className={styles.content}>
      <p>Escolha sua ilustração e a cor do seu perfil. Você pode trocar depois.</p>
      <div className={styles.avatarPreview} aria-label="Prévia do avatar" style={{ background: selectedColor }}>
        <img src={avatarFor(selectedAvatar).image} alt={avatarFor(selectedAvatar).name} />
      </div>
      <div className={styles.colorChoices} role="group" aria-label="Cor do avatar">
        {AVATAR_COLORS.map((color) => <button key={color.value} type="button" className={styles.colorChoice} style={{ background: color.value }} aria-label={`Cor ${color.name}`} aria-pressed={selectedColor === color.value} title={color.name} onClick={() => setSelectedColor(color.value)}>{selectedColor === color.value ? '✓' : ''}</button>)}
      </div>
      <div className={styles.avatars} role="group" aria-label="Escolha seu avatar">
        {AVATARS.map((avatar) => <button key={avatar.id} type="button" className={styles.avatarChoice} style={{ background: selectedAvatar === avatar.id ? selectedColor : avatar.color }} aria-label={`Usar avatar ${avatar.name}`} aria-pressed={selectedAvatar === avatar.id} onClick={() => setSelectedAvatar(avatar.id)}><img src={avatar.image} alt="" /><span>{avatar.name}</span></button>)}
      </div>
      <div className={styles.avatarActions}>
        <button type="button" className={styles.primary} onClick={() => chooseAvatar(selectedAvatar, selectedColor)}>salvar meu avatar</button>
        <button type="button" className={styles.secondary} onClick={closeAccount}>escolher depois</button>
      </div>
    </section>
  );
  if (view === 'appointments') return (
    <section className={styles.content}>
      <p>Nenhum agendamento disponível nesta demonstração.</p>
      <button type="button" className={styles.primary} onClick={() => { closeAccount(); openBook(null); }}>abrir agenda →</button>
      <button type="button" className={styles.secondary} onClick={() => setView('profile')}>voltar para minha conta</button>
    </section>
  );
  return (
    <form className={styles.form} onSubmit={submit}>
      {isProfile && user && <button type="button" className={styles.profileAvatar} style={{ background: user.avatarColor ?? avatarFor(user.avatar).color }} onClick={() => setView('avatar')}><img src={avatarFor(user.avatar).image} alt="" /><span>trocar ilustração e cor →</span></button>}
      {view === 'login' && <p className={styles.intro}>Acesse sua conta para acompanhar seus agendamentos.</p>}
      {view === 'recover' && <p className={styles.intro}>Qual e-mail você usou no cadastro?</p>}
      {hasPersonalFields && <label className={styles.field}>nome<input ref={nameRef} name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="como podemos te chamar?" required maxLength={100} /></label>}
      {hasPersonalFields && <label className={styles.field}>WhatsApp<input ref={phoneRef} type="tel" name="phone" autoComplete="tel" value={phone} onChange={(event) => maskPhone(event.target.value)} placeholder="(11) 90000-0000" required /></label>}
      <label className={styles.field}>e-mail<input type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" required maxLength={254} /></label>
      {(view === 'login' || isSignup) && <label className={styles.field}>senha<div className={styles.password}><input type={showPassword ? 'text' : 'password'} name="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'use uma senha fictícia com 8 ou mais caracteres' : 'sua senha fictícia'} minLength={8} maxLength={128} required aria-describedby="demo-password-note" /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'ocultar' : 'mostrar'}</button></div><span id="demo-password-note" className={styles.hint}>A senha não é enviada, salva ou verificada nesta demo.</span></label>}
      {view === 'login' && <button type="button" className={styles.textButton} onClick={() => setView('recover')}>esqueci minha senha</button>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.message} role="status">{message}</p>}
      <button type="submit" className={styles.primary}>{isSignup ? 'criar conta demo →' : isProfile ? 'salvar alterações' : view === 'recover' ? 'simular recuperação →' : 'entrar na demo →'}</button>
      {view === 'login' && <p className={styles.switch}>Ainda não tem conta? <button type="button" onClick={() => setView('signup')}>criar conta</button></p>}
      {isSignup && <p className={styles.switch}>Já tem conta? <button type="button" onClick={() => setView('login')}>entrar</button></p>}
      {view === 'recover' && <button type="button" className={styles.secondary} onClick={() => setView('login')}>← voltar para entrar</button>}
      {isProfile && <button type="button" className={styles.secondary} onClick={() => setView('appointments')}>meus agendamentos →</button>}
    </form>
  );
}
