import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/install';
import App from './App';
import { firebaseConfigured, loadCloud, setAccount } from './lib/account';
import { initReminders } from './lib/reminder';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (firebaseConfigured)
  loadCloud()
    .then((m) => m.initCloud())
    .catch(() => setAccount({ ready: true, sync: 'offline' }));
else setAccount({ ready: true });

if ('serviceWorker' in navigator && (import.meta.env.PROD || import.meta.env.VITE_SW_DEV)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(() => {})
      .finally(initReminders);
  });
} else initReminders();
