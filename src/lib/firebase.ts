import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore';

/** Default (public) web config for the Firebase project. Override with VITE_FIREBASE_* env vars. */
export const firebaseConfig = {
  apiKey: 'AIzaSyCe5NP46mTWZLXBvs396TqeoMme_5K7-4c',
  authDomain: 'hoc-tieng-trung-6f3e1.firebaseapp.com',
  projectId: 'hoc-tieng-trung-6f3e1',
  storageBucket: 'hoc-tieng-trung-6f3e1.firebasestorage.app',
  messagingSenderId: '372532313687',
  appId: '1:372532313687:web:bd274991ce0b592609ed12',
};

const env = import.meta.env;
export const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

export const app = initializeApp(config);
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
