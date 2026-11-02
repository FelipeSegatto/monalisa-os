import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AvatarId } from '../data/avatars';
import { AccountContext } from './AccountContext';
import type { DemoProfile, AccountView } from './AccountContext';

function useDemoAccount() {
  // Demo identity lives in memory only. No passwords, tokens or personal data are persisted.
  const [user, setUser] = useState<DemoProfile | null>(null);
  const [lastProfile, setLastProfile] = useState<DemoProfile | null>(null);
  const [view, setView] = useState<AccountView>(null);
  const openAccount = () => setView(user ? 'profile' : 'login');
  const closeAccount = () => setView(null);
  const demoLogin = (email: string) => {
    const normalized = email.trim().toLowerCase();
    const profile = lastProfile?.email.toLowerCase() === normalized ? lastProfile : {
      name: '', email: normalized, phone: '', avatar: 'heart' as const,
    };
    setUser(profile);
    setLastProfile(profile);
    setView(null);
  };
  const demoSignup = (profile: DemoProfile) => {
    setUser(profile);
    setLastProfile(profile);
    setView('avatar');
  };
  const updateProfile = (profile: DemoProfile) => {
    setUser(profile);
    setLastProfile(profile);
  };
  const chooseAvatar = (avatar: AvatarId) => {
    if (user) updateProfile({ ...user, avatar });
    setView(null);
  };
  const logout = () => { setUser(null); setView(null); };
  return { user, view, setView, openAccount, closeAccount, demoLogin, demoSignup, updateProfile, chooseAvatar, logout };
}


export type AccountState = ReturnType<typeof useDemoAccount>;
export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useDemoAccount();
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
