import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';

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

function makeDb(): Firestore {
  try {
    // IndexedDB cache: reads work offline and writes are queued until the connection is back.
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  }
}
export const db = makeDb();
