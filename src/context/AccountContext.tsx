import { createContext, useContext } from 'react';
import type { AvatarId } from '../data/avatars';
import type { AccountState } from './AccountProvider';

export interface DemoProfile {
  name: string;
  email: string;
  phone: string;
  avatar: AvatarId;
}
export type AccountView = 'login' | 'signup' | 'recover' | 'avatar' | 'profile' | 'appointments' | null;

export const AccountContext = createContext<AccountState | null>(null);
export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount must be used within AccountProvider');
  return account;
}
