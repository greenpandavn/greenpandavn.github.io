import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore';

import { firebaseConfig, firebaseConfigured } from './firebaseConfig';

if (!firebaseConfigured) throw Object.assign(new Error('Firebase is not configured (VITE_FIREBASE_* env vars missing)'), { code: 'app/not-configured' });

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/*
 * Memory cache + long polling: robust behind proxies/VPNs and with several tabs open (no IndexedDB lease).
 * Offline edits are kept in the per-account localStorage copy (store.ts) and re-uploaded as a full snapshot
 * when the connection returns or on the next login (see cloud.ts), so nothing queued offline is lost.
 */
function makeDb(): Firestore {
  return initializeFirestore(app, { localCache: memoryLocalCache(), experimentalForceLongPolling: true });
}
export const db = makeDb();
