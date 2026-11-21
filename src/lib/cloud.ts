import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  getCountFromServer,
  getDoc,
  getDocsFromCache,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { applyRemote, defaultProgress, getProgress, GUEST_KEY, loadFrom, onLocalChange, sanitize, updateProgress, switchStorageSlot } from './store';
import { mergeProgress, resolveLogin, weekId, weekXp } from './merge';
import { getAccount, setAccount } from './account';
import type { Progress } from '../types';

const MIGRATED_KEY = 'hoc-tieng-trung-migrated-uids';
const CLIENT_ID = Math.random().toString(36).slice(2);
const userKey = (uid: string) => `${GUEST_KEY}:user:${uid}`;

let stopSnapshot: Unsubscribe | null = null;
let stopLocal: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastWritten = 0;
let started = false;
let pendingName = '';
let kicking = false;
let pendingSince = 0;

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Restart Firestore's streams – recovers a write/listen channel left broken after sleep or network changes. */
async function kickNetwork() {
  if (kicking || !navigator.onLine) return;
  kicking = true;
  try {
    await disableNetwork(db);
    await enableNetwork(db);
  } catch (e) {
    console.warn('Network restart failed', e);
  } finally {
    kicking = false;
  }
}
const kickIfStuck = () => {
  if (pendingSince && Date.now() - pendingSince > 3000) void kickNetwork();
};

const migratedUids = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(MIGRATED_KEY) || '[]');
  } catch {
    return [];
  }
};
const markMigrated = (uid: string) => localStorage.setItem(MIGRATED_KEY, JSON.stringify([...new Set([...migratedUids(), uid])]));

const nameOf = (u: User, p?: Progress) => (u.displayName || pendingName || p?.settings.name || u.email?.split('@')[0] || 'Học viên').slice(0, 40);

function toUser(u: User) {
  return {
    uid: u.uid,
    email: u.email,
    displayName: nameOf(u),
    photoURL: u.photoURL,
    provider: u.providerData[0]?.providerId ?? 'password',
  };
}

async function upload(u: User, p: Progress) {
  const now = Date.now();
  lastWritten = now;
  const displayName = getAccount().user?.displayName || nameOf(u, p);
  setAccount({ sync: navigator.onLine ? 'saving' : 'offline' });
  // Firestore queues these writes in IndexedDB while offline and flushes them when back online.
  const writes = [
    setDoc(doc(db, 'users', u.uid), { displayName, progress: JSON.parse(JSON.stringify(p)), updatedAt: now, clientId: CLIENT_ID }),
    setDoc(doc(db, 'leaderboard', u.uid), { displayName, xp: Math.round(p.xp), updatedAt: now }),
  ];
  const wxp = weekXp(p);
  if (wxp > 0) writes.push(setDoc(doc(db, 'weeks', weekId(), 'entries', u.uid), { displayName, xp: Math.round(wxp), updatedAt: now }));
  if (!pendingSince) pendingSince = now;
  // Writes stay queued while the stream is down; if nothing is acknowledged for a while, restart the network.
  const watchdog = setInterval(kickIfStuck, 6000);
  try {
    await Promise.all(writes);
    if (lastWritten === now) {
      pendingSince = 0;
      setAccount({ sync: 'saved' });
    }
  } catch (e) {
    pendingSince = 0;
    console.warn('Sync failed', e);
    setAccount({ sync: 'error' });
  } finally {
    clearInterval(watchdog);
  }
}

function scheduleUpload(u: User) {
  if (timer) clearTimeout(timer);
  setAccount({ sync: navigator.onLine ? 'saving' : 'offline' });
  timer = setTimeout(() => {
    timer = null;
    void upload(u, getProgress());
  }, 600);
}

async function startSession(u: User) {
  setAccount({ ready: true, user: toUser(u), sync: 'saving' });
  const guest = loadFrom(GUEST_KEY);
  const cache = loadFrom(userKey(u.uid));
  switchStorageSlot(userKey(u.uid), cache ?? defaultProgress());

  let cloud: Progress | null = null;
  let reachable = true;
  try {
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (snap.exists()) cloud = sanitize(snap.data().progress);
  } catch (e) {
    reachable = false;
    console.warn('Cloud unavailable, using offline cache', e);
  }
  if (auth.currentUser?.uid !== u.uid) return;

  const { progress, migrated } = resolveLogin({
    cloud,
    cache,
    guest,
    alreadyMigrated: migratedUids().includes(u.uid),
    fallback: defaultProgress(),
  });
  if (!progress.settings.name) progress.settings = { ...progress.settings, name: nameOf(u) };
  applyRemote(progress);
  if (migrated) markMigrated(u.uid);
  setAccount({ migrated, user: { ...toUser(u), displayName: u.displayName || progress.settings.name || nameOf(u) } });

  stopLocal?.();
  stopLocal = onLocalChange(() => scheduleUpload(u));
  void upload(u, progress);
  if (!reachable) setAccount({ sync: 'offline' });

  stopSnapshot?.();
  stopSnapshot = onSnapshot(
    doc(db, 'users', u.uid),
    (snap) => {
      if (!snap.exists() || snap.metadata.hasPendingWrites) return;
      const data = snap.data();
      if (data.clientId === CLIENT_ID && data.updatedAt === lastWritten) return;
      if (data.clientId === CLIENT_ID && data.updatedAt < lastWritten) return;
      const remote = sanitize(data.progress);
      // Another device changed the data: cloud is the source of truth, but keep unsent local edits.
      applyRemote(timer ? mergeProgress(getProgress(), remote) : remote);
    },
    (e) => console.warn('Snapshot error', e),
  );
}

function endSession() {
  stopSnapshot?.();
  stopSnapshot = null;
  stopLocal?.();
  stopLocal = null;
  if (timer) clearTimeout(timer);
  timer = null;
  switchStorageSlot(GUEST_KEY, loadFrom(GUEST_KEY) ?? defaultProgress());
  setAccount({ ready: true, user: null, sync: 'idle', migrated: false });
}

export function initCloud() {
  if (started) return;
  started = true;
  getRedirectResult(auth).catch((e) => console.warn('Redirect sign-in failed', e));
  onAuthStateChanged(auth, (u) => {
    if (u) void startSession(u);
    else endSession();
  });
  window.addEventListener('online', () => {
    const u = auth.currentUser;
    if (!u) return;
    void kickNetwork();
    void upload(u, getProgress());
    // the first reconnect attempt often races the network coming up – retry shortly after
    setTimeout(kickIfStuck, 4000);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && auth.currentUser) kickIfStuck();
  });
  window.addEventListener('offline', () => {
    if (auth.currentUser) setAccount({ sync: 'offline' });
  });
}

// ---------- auth actions ----------
const ERRORS: Record<string, string> = {
  'auth/invalid-email': 'Email không hợp lệ.',
  'auth/missing-password': 'Vui lòng nhập mật khẩu.',
  'auth/weak-password': 'Mật khẩu cần ít nhất 6 ký tự.',
  'auth/email-already-in-use': 'Email này đã được đăng ký. Hãy đăng nhập.',
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
  'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
  'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
  'auth/too-many-requests': 'Bạn thử quá nhiều lần. Vui lòng đợi một lát.',
  'auth/network-request-failed': 'Không có kết nối mạng. Hãy thử lại.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
  'auth/cancelled-popup-request': 'Bạn đã đóng cửa sổ đăng nhập Google.',
  'auth/unauthorized-domain': 'Tên miền này chưa được cho phép đăng nhập Google (cần thêm trong Firebase Console).',
  'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được bật trong Firebase.',
};
export const authErrorMessage = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? '';
  return ERRORS[code] ?? `Có lỗi xảy ra (${code || 'không rõ'}). Vui lòng thử lại.`;
};

export async function registerEmail(name: string, email: string, password: string) {
  pendingName = name.trim().slice(0, 40);
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim().slice(0, 40) });
  setAccount({ user: toUser(cred.user) });
  updateProgress((p) => ({ ...p, settings: { ...p.settings, name: name.trim().slice(0, 40) } }));
  return cred.user;
}

export const loginEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email.trim(), password);

export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

export async function logout() {
  const u = auth.currentUser;
  if (u && timer) {
    clearTimeout(timer);
    timer = null;
    await upload(u, getProgress()).catch(() => undefined);
  }
  await signOut(auth);
}

export async function setDisplayName(name: string) {
  const u = auth.currentUser;
  const clean = name.trim().slice(0, 40);
  if (!clean) return;
  if (u) {
    await updateProfile(u, { displayName: clean });
    setAccount({ user: { ...toUser(u), displayName: clean } });
  }
  updateProgress((p) => ({ ...p, settings: { ...p.settings, name: clean } }));
}

// ---------- leaderboard ----------
export interface BoardRow {
  uid: string;
  displayName: string;
  xp: number;
}
export interface Board {
  rows: BoardRow[];
  me: { rank: number; xp: number } | null;
}

export async function fetchBoard(kind: 'week' | 'all'): Promise<Board> {
  const col = kind === 'all' ? collection(db, 'leaderboard') : collection(db, 'weeks', weekId(), 'entries');
  const q = query(col, orderBy('xp', 'desc'), limit(20));
  let snap;
  try {
    snap = await withTimeout(getDocsFromServer(q), 10000);
  } catch (e) {
    void kickNetwork();
    snap = await getDocsFromCache(q).catch(() => null);
    if (!snap || snap.empty) throw e;
  }
  const rows = snap.docs.map((d) => ({ uid: d.id, displayName: String(d.data().displayName ?? 'Học viên'), xp: Number(d.data().xp ?? 0) }));
  const u = auth.currentUser;
  let me: Board['me'] = null;
  if (u) {
    const xp = kind === 'all' ? Math.round(getProgress().xp) : Math.round(weekXp(getProgress()));
    const idx = rows.findIndex((r) => r.uid === u.uid);
    if (idx >= 0) me = { rank: idx + 1, xp: rows[idx].xp };
    else if (xp > 0) {
      const higher = await withTimeout(getCountFromServer(query(col, where('xp', '>', xp))), 8000).catch(() => null);
      me = higher ? { rank: higher.data().count + 1, xp } : null;
    }
  }
  return { rows, me };
}
