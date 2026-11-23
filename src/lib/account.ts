import { useSyncExternalStore } from 'react';

/** Firebase-free account state so the main bundle stays small; cloud.ts fills it in. */
export interface AccountState {
  ready: boolean; // auth state resolved
  user: { uid: string; email: string | null; displayName: string; photoURL: string | null; provider: string } | null;
  sync: 'idle' | 'saving' | 'saved' | 'offline' | 'error';
  migrated: boolean; // local progress merged into the account on this login
  role: 'admin' | 'user';
  notice: string; // e.g. "account locked" message shown after a forced sign-out
  revoked: string[]; // certificate keys revoked by an admin (hidden, but kept in the stored progress)
  /** Firebase anonymous identity of a learner who has not logged in (`user` stays null for them). */
  anon?: { uid: string; no: number; name: string } | null;
}

export const OWNER_EMAIL = 'virusphuoc@gmail.com';
let state: AccountState = { ready: false, user: null, sync: 'idle', migrated: false, role: 'user', notice: '', revoked: [] };
const listeners = new Set<() => void>();

export const getAccount = () => state;
export const certKey = (c: { id: string; date: string }) => `${c.id}@${c.date}`;
/** Certificates to show the learner (admin-revoked ones are hidden). */
export const visibleCerts = <T extends { id: string; date: string }>(certs: T[], revoked: string[]) =>
  revoked.length ? certs.filter((c) => !revoked.includes(certKey(c))) : certs;
const SIGNED_IN_KEY = 'gp-signed-in';
/** True when an account was signed in on this device at the last launch (known before Firebase is loaded). */
export function everSignedIn() {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) === '1';
  } catch {
    return false;
  }
}
export function setAccount(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  if ('user' in patch || patch.ready)
    try {
      if (state.user) localStorage.setItem(SIGNED_IN_KEY, '1');
      else if (state.ready) localStorage.removeItem(SIGNED_IN_KEY);
    } catch {
      /* private mode */
    }
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
