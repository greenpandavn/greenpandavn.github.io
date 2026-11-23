import { useSyncExternalStore } from 'react';
import { APP_VERSION } from './version';

/** "What's new" notice. The bundled one ships with each release; admins can replace it from Firestore (site/announcement). */
export interface Announcement {
  version: string;
  title: string;
  body: string; // plain text, one line per item ("- " starts a bullet)
  updatedAt: number;
}

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  version: APP_VERSION,
  title: `GreenPanda v${APP_VERSION} có gì mới?`,
  body: [
    '- Thư viện bài thi tiếng Anh mở rộng: thêm TOEIC 2 và TOEIC 3 (mỗi đề 200 câu), bài kiểm tra ngắn 20 câu cho Phần 1–3 và bài kiểm tra trình độ đầu vào (A1–C1).',
    '- Thêm phần Luyện nghe tiếng Anh (25 bài nghe ngắn) và 5 bộ đề theo cấp độ CEFR A1–C1.',
    '- Từ vựng tiếng Anh đã vượt mốc 5.000 từ.',
    '- Tất cả nằm trong mục “Thi thử tiếng Anh” ở trang Học.',
  ].join('\n'),
  updatedAt: 0,
};

const CACHE_KEY = 'gp-announcement';
const SEEN_KEY = 'gp-announcement-seen';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function cleanAnnouncement(raw: unknown): Announcement | null {
  const r = raw as Partial<Announcement> | null;
  if (!r || typeof r.title !== 'string' || typeof r.body !== 'string' || !r.title.trim()) return null;
  return {
    version: String(r.version ?? '').trim().replace(/^v/i, '').slice(0, 20),
    title: r.title.trim().slice(0, 80),
    body: r.body.trim().slice(0, 1500),
    updatedAt: Number(r.updatedAt) || 0,
  };
}

/** Compare dotted versions: >0 when a is newer. */
export function compareVersions(a: string, b: string) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** The admin's notice wins unless it is for an older version than this build. */
export const pickAnnouncement = (remote: Announcement | null, bundled = DEFAULT_ANNOUNCEMENT) =>
  remote && compareVersions(remote.version, bundled.version) >= 0 ? remote : bundled;

export const announcementId = (a: Announcement) => `${a.version}|${a.updatedAt}`;

let remote: Announcement | null = (() => {
  try {
    return cleanAnnouncement(JSON.parse(read(CACHE_KEY) || 'null'));
  } catch {
    return null;
  }
})();
let seen = read(SEEN_KEY) ?? '';
let snapshot: Announcement | null = null;
const listeners = new Set<() => void>();

function refresh() {
  const a = pickAnnouncement(remote);
  snapshot = announcementId(a) === seen ? null : a;
  listeners.forEach((l) => l());
}
refresh();

/** Called by the cloud layer with the Firestore document (or null when there is none). */
export function setRemoteAnnouncement(raw: unknown) {
  remote = cleanAnnouncement(raw);
  try {
    if (remote) localStorage.setItem(CACHE_KEY, JSON.stringify(remote));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* private mode */
  }
  refresh();
}

export function dismissAnnouncement() {
  if (!snapshot) return;
  seen = announcementId(snapshot);
  try {
    localStorage.setItem(SEEN_KEY, seen);
  } catch {
    /* private mode */
  }
  refresh();
}

export const currentAnnouncement = () => pickAnnouncement(remote);

/** The notice to show now, or null when the learner has already closed it. */
export const useAnnouncement = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
