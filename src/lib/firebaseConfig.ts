/** Firebase web config, read only from Vite env vars (set them in .env.local or in Vercel). */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

/** Accounts, sync and leaderboard need at least these; without them the app runs fully offline (guest mode). */
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

export const NOT_CONFIGURED_MSG = 'Ứng dụng chưa cấu hình Firebase nên tạm thời chưa dùng được tài khoản, đồng bộ và bảng xếp hạng. Bạn vẫn học đầy đủ, tiến độ được lưu trên máy này.';
