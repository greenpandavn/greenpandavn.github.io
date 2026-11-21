import { useSyncExternalStore } from 'react';

/** Firebase-free account state so the main bundle stays small; cloud.ts fills it in. */
export interface AccountState {
  ready: boolean; // auth state resolved
  user: { uid: string; email: string | null; displayName: string; photoURL: string | null; provider: string } | null;
  sync: 'idle' | 'saving' | 'saved' | 'offline' | 'error';
  migrated: boolean; // local progress merged into the account on this login
  role: 'admin' | 'user';
  notice: string; // e.g. "account locked" message shown after a forced sign-out
}

export const OWNER_EMAIL = 'virusphuoc@gmail.com';
let state: AccountState = { ready: false, user: null, sync: 'idle', migrated: false, role: 'user', notice: '' };
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

import { firebaseConfigured, NOT_CONFIGURED_MSG } from './firebaseConfig';

export { firebaseConfigured };
/** Lazily loads the Firebase layer; rejects when the VITE_FIREBASE_* env vars are missing. */
export const loadCloud = () =>
  firebaseConfigured ? import('./cloud') : Promise.reject(Object.assign(new Error(NOT_CONFIGURED_MSG), { code: 'app/not-configured' }));
