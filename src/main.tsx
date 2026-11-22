import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/install';
import App from './App';
import { everSignedIn, firebaseConfigured, loadCloud, setAccount } from './lib/account';
import { initReminders } from './lib/reminder';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Firebase (auth, sync) is a big download: it starts after the first paint. A signed-in learner gets it right
// after that paint, a guest once the browser is idle.
const startCloud = () =>
  loadCloud()
    .then((m) => m.initCloud())
    .catch(() => setAccount({ ready: true, sync: 'offline' }));
if (!firebaseConfigured) setAccount({ ready: true });
else
  requestAnimationFrame(() => {
    if (everSignedIn() || !('requestIdleCallback' in window)) setTimeout(startCloud, everSignedIn() ? 0 : 2000);
    else window.requestIdleCallback(startCloud, { timeout: 3000 });
  });

if ('serviceWorker' in navigator && (import.meta.env.PROD || import.meta.env.VITE_SW_DEV)) {
  // The service worker downloads the whole app for offline use; it starts a few seconds after the page has
  // loaded so that it does not compete with the first screen on a slow connection.
  window.addEventListener('load', () =>
    setTimeout(
      () =>
        navigator.serviceWorker
          .register('./sw.js')
          .catch(() => {})
          .finally(initReminders),
      4000,
    ),
  );
} else initReminders();
