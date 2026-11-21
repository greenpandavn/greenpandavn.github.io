import { dateKey } from './date';
import { getProgress, onLocalChange } from './store';
import type { Progress } from '../types';

export const REMINDER_TEXT = 'Đến giờ học ngoại ngữ rồi!';
const LAST_KEY = 'hoc-tieng-trung-reminded';

export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const notifyPermission = (): NotificationPermission | 'unsupported' => (notifySupported() ? Notification.permission : 'unsupported');

export const studiedToday = (p: Progress) => (p.days[dateKey()] ?? 0) > 0;

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export function isReminderDue(p: Progress, now = new Date()) {
  return p.settings.reminderOn && !studiedToday(p) && now.getHours() * 60 + now.getMinutes() >= minutes(p.settings.reminderTime);
}

/** Share reminder settings with the service worker (used by periodic background sync). */
async function postState(p: Progress) {
  const reg = await navigator.serviceWorker?.getRegistration();
  reg?.active?.postMessage({
    type: 'reminder-state',
    state: { on: p.settings.reminderOn, time: p.settings.reminderTime, lastStudy: studiedToday(p) ? dateKey() : null },
  });
}

async function fire() {
  const p = getProgress();
  const today = dateKey();
  if (!isReminderDue(p) || localStorage.getItem(LAST_KEY) === today || notifyPermission() !== 'granted') return;
  localStorage.setItem(LAST_KEY, today);
  const opts: NotificationOptions = { body: 'Học một bài ngắn để giữ chuỗi ngày nhé 🐼', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'daily-reminder' };
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(REMINDER_TEXT, opts);
  else new Notification(REMINDER_TEXT, opts);
}

export async function requestNotify(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported';
  const r = await Notification.requestPermission();
  if (r === 'granted') void registerPeriodic();
  return r;
}

async function registerPeriodic() {
  try {
    const reg = (await navigator.serviceWorker?.ready) as ServiceWorkerRegistration & {
      periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void> };
    };
    await reg?.periodicSync?.register('daily-reminder', { minInterval: 60 * 60 * 1000 });
  } catch {
    /* only available for installed PWAs in Chromium */
  }
}

let started = false;
export function initReminders() {
  if (started || typeof window === 'undefined') return;
  started = true;
  void postState(getProgress());
  onLocalChange((p) => void postState(p));
  if (notifyPermission() === 'granted') void registerPeriodic();
  void fire();
  setInterval(() => void fire(), 60 * 1000);
  document.addEventListener('visibilitychange', () => void fire());
}
