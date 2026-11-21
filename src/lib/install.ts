import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let snapshot = { canPrompt: false, installed };

function refresh() {
  snapshot = { canPrompt: !!deferred, installed };
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    refresh();
  });
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  refresh();
  return outcome === 'accepted';
}

export function useInstall() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
}

export const installHelp = () =>
  isIOS() ? 'Trên iPhone/iPad: bấm nút Chia sẻ trong Safari rồi chọn “Thêm vào MH chính”.' : 'Mở menu trình duyệt (⋮) và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.';
