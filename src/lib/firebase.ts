import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache, terminate, type Firestore } from 'firebase/firestore';

import { firebaseConfig, firebaseConfigured } from './firebaseConfig';

if (!firebaseConfigured) throw Object.assign(new Error('Firebase is not configured (VITE_FIREBASE_* env vars missing)'), { code: 'app/not-configured' });

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
/** Local testing only: `VITE_FIREBASE_EMULATOR=1` points the app at the Firebase Emulator Suite (auth :9099, firestore :8080). */
const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1';
if (useEmulator) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

/*
 * Memory cache + long polling: robust behind proxies/VPNs and with several tabs open (no IndexedDB lease).
 * Offline edits are kept in the per-account localStorage copy (store.ts) and re-uploaded as a full snapshot
 * when the connection returns or on the next login (see cloud.ts), so nothing queued offline is lost.
 */
function makeDb(): Firestore {
  const d = initializeFirestore(app, { localCache: memoryLocalCache(), experimentalForceLongPolling: true });
  if (useEmulator) connectFirestoreEmulator(d, '127.0.0.1', 8080);
  return d;
}
export let db = makeDb();

/** Replace the Firestore client with a fresh one (last resort when its long-poll channel stays broken after a reconnect). */
export async function resetDb() {
  const old = db;
  await terminate(old).catch(() => undefined);
  db = makeDb();
}
