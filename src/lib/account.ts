import { useSyncExternalStore } from 'react';

/** Firebase-free account state so the main bundle stays small; cloud.ts fills it in. */
export interface AccountState {
  ready: boolean; // auth state resolved
  user: { uid: string; email: string | null; displayName: string; photoURL: string | null; provider: string } | null;
  sync: 'idle' | 'saving' | 'saved' | 'offline' | 'error';
  migrated: boolean; // local progress merged into the account on this login
}

let state: AccountState = { ready: false, user: null, sync: 'idle', migrated: false };
const listeners = new Set<() => void>();

export const getAccount = () => state;
export function setAccount(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function useAccount() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

const cloud = () => import('./cloud');
export const loadCloud = cloud;
