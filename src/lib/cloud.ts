import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  linkWithCredential,
  linkWithPopup,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
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
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, resetDb } from './firebase';
import { firebaseConfig } from './firebaseConfig';
import { levelInfo } from './gamification';
import { applyRemote, courseView, defaultProgress, getStored, GUEST_KEY, xpByCourse, loadFrom, onLocalChange, sanitize, updateProgress, switchStorageSlot } from './store';
import { mergeProgress, resolveLogin, weekId, weekXp } from './merge';
import { getAccount, OWNER_EMAIL, setAccount } from './account';
import { applyContent, type LessonDoc, type UnitDoc } from '../data';
import type { Progress } from '../types';
import { setSocialName, startSocial, stopSocial } from './social';
import { startVisits } from './visits';
import { setRemoteAnnouncement } from './announcement';

const MIGRATED_KEY = 'hoc-tieng-trung-migrated-uids';
const CLIENT_ID = Math.random().toString(36).slice(2);
const userKey = (uid: string) => `${GUEST_KEY}:user:${uid}`;

let stopSnapshot: Unsubscribe | null = null;
let stopLocal: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastWritten = 0;
let started = false;
let pendingName = '';
let profileName = ''; // display name last written to profiles/{uid}
let stopRole: Unsubscribe | null = null;
let roleInfo: { forcedName: string; hidden: boolean; revoked: string[] } = { forcedName: '', hidden: false, revoked: [] };
const LOCKED_MSG = 'Tài khoản này đã bị khóa. Vui lòng liên hệ huuphuocln@gmail.com nếu cần hỗ trợ.';
let kicking = false;
let pendingSince = 0;
let kickedAt = 0;
let rebuilding = false;
let reconnecting = false;

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Restart Firestore's streams – recovers a write/listen channel left broken after sleep or network changes. */
async function kickNetwork() {
  if (kicking || rebuilding || !navigator.onLine) return;
  kicking = true;
  kickedAt = Date.now();
  try {
    await disableNetwork(db);
    await enableNetwork(db);
  } catch (e) {
    console.warn('Network restart failed', e);
  } finally {
    kicking = false;
  }
}

/** A restart didn't help (channel keeps failing): rebuild the client, re-attach listeners and re-send the local snapshot. */
async function rebuildClient() {
  const u = auth.currentUser;
  if (rebuilding || !u || !navigator.onLine) return;
  rebuilding = true;
  try {
    await resetDb();
  } finally {
    rebuilding = false;
  }
  pendingSince = 0;
  reconnecting = false;
  if (auth.currentUser?.uid !== u.uid) return;
  listen(u);
  void upload(u, getStored());
}

/**
 * Escalation for writes that stay unacknowledged: one stream restart per pending batch, then (if that didn't help)
 * a full client rebuild. Restarting more often keeps aborting the long-poll channel, so each step happens once.
 */
const kickIfStuck = () => {
  if (!pendingSince || !navigator.onLine || kicking || rebuilding) return;
  const now = Date.now();
  // After going offline the long-poll channel is usually dead for good; a stream restart doesn't revive it, a new client does.
  if (reconnecting && now - pendingSince > 1800) void rebuildClient();
  else if (kickedAt >= pendingSince) {
    if (now - kickedAt > 4000) void rebuildClient();
  } else if (now - pendingSince > 8000) void kickNetwork();
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
  const displayName = roleInfo.forcedName || getAccount().user?.displayName || nameOf(u, p);
  setAccount({ sync: navigator.onLine ? 'saving' : 'offline' });
  const createdAt = Date.parse(u.metadata.creationTime ?? '') || now;
  const writes = [
    setDoc(doc(db, 'users', u.uid), {
      displayName,
      email: u.email ?? '',
      createdAt,
      lastActive: now,
      progress: JSON.parse(JSON.stringify(p)),
      updatedAt: now,
      clientId: CLIENT_ID,
    }),
  ];
  // Moderation: hidden users stay off the public boards.
  const total = Math.round(xpByCourse(p).total);
  if (!roleInfo.hidden) writes.push(writeBoard(u.uid, { displayName, xp: total, updatedAt: now }, { level: levelInfo(total).level }));
  const wxp = totalWeekXp(p);
  if (wxp > 0 && !roleInfo.hidden) writes.push(setDoc(doc(db, 'weeks', weekId(), 'entries', u.uid), { displayName, xp: Math.round(wxp), updatedAt: now }));
  // Public name for the friend search. Kept out of the sync status: it needs the v4 rules to be published.
  if (displayName !== profileName) {
    setSocialName(displayName);
    setDoc(doc(db, 'profiles', u.uid), { displayName, nameLower: displayName.toLowerCase(), updatedAt: now })
      .then(() => (profileName = displayName))
      .catch((e) => console.warn('Profile not published', (e as { code?: string }).code));
  }
  if (!pendingSince) pendingSince = now;
  // Writes stay queued while the stream is down; if nothing is acknowledged for a while, restart the network.
  const watchdog = setInterval(kickIfStuck, 2000);
  try {
    await Promise.all(writes);
    if (lastWritten === now) {
      pendingSince = 0;
      reconnecting = false;
      setAccount({ sync: 'saved' });
    }
  } catch (e) {
    if (rebuilding || lastWritten !== now) return; // superseded (e.g. client rebuilt mid-write)
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
    void upload(u, getStored());
  }, 600);
}

/** Read (and for the owner, bootstrap) the account's role document; false when the account is locked. */
async function checkRole(u: User): Promise<boolean> {
  try {
    const ref = doc(db, 'roles', u.uid);
    const snap = await getDoc(ref);
    const d = snap.exists() ? snap.data() : {};
    if (d.locked) return false;
    const owner = u.email?.toLowerCase() === OWNER_EMAIL && u.emailVerified;
    if (owner && d.role !== 'admin') await setDoc(ref, { role: 'admin', email: u.email, updatedAt: Date.now() }, { merge: true });
    applyRole({ ...d, role: owner ? 'admin' : d.role });
  } catch (e) {
    console.warn('Role check failed', e);
  }
  return true;
}

function applyRole(d: Record<string, unknown>) {
  roleInfo = {
    forcedName: typeof d.forcedName === 'string' ? d.forcedName : '',
    hidden: d.hidden === true,
    revoked: Array.isArray(d.revoked) ? (d.revoked as string[]) : [],
  };
  const patch: Partial<ReturnType<typeof getAccount>> = { role: d.role === 'admin' ? 'admin' : 'user', revoked: roleInfo.revoked };
  const cur = getAccount().user;
  if (roleInfo.forcedName && cur && cur.displayName !== roleInfo.forcedName) {
    patch.user = { ...cur, displayName: roleInfo.forcedName };
    updateProgress((p) => ({ ...p, settings: { ...p.settings, name: roleInfo.forcedName } }));
  }
  setAccount(patch);
}

async function forceLogout(msg: string) {
  setAccount({ notice: msg });
  await signOut(auth);
}

// ---------- anonymous learners (v5.2.8) ----------
const ANON_KEY = 'gp-anon'; // { uid, no }: the join number already given to this anonymous uid
const CARRIED_KEY = 'gp-anon-carried'; // guest XP already merged into an account, so it is not counted twice
const DROP_KEY = 'gp-anon-drop'; // anonymous identity to clean up once a real account is signed in
const ANON_NAME = 'Học viên ẩn danh';
let anonTimer: ReturnType<typeof setTimeout> | null = null;
let stopAnon: (() => void) | null = null;
let anonRetryAt = 0;
let legacyBoard = false; // the published rules still reject the v5.2.8 leaderboard fields

const readJson = <T,>(store: Storage, key: string, fallback: T): T => {
  try {
    return (JSON.parse(store.getItem(key) || 'null') as T) ?? fallback;
  } catch {
    return fallback;
  }
};
const carried = () => readJson(localStorage, CARRIED_KEY, { zh: 0, en: 0 });

/** Leaderboard write; falls back to the pre-5.2.8 fields while the new rules are not published. */
async function writeBoard(uid: string, base: { displayName: string; xp: number; updatedAt: number }, extra: Record<string, unknown>) {
  const ref = doc(db, 'leaderboard', uid);
  if (!legacyBoard)
    try {
      return await setDoc(ref, { ...base, ...extra });
    } catch (e) {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      legacyBoard = true;
    }
  return setDoc(ref, base);
}

/** Join number of an anonymous learner: taken once from a counter in a transaction, so two learners never share one. */
async function anonNumber(uid: string, xp: number): Promise<number> {
  const saved = readJson<{ uid?: string; no?: number }>(localStorage, ANON_KEY, {});
  if (saved.uid === uid && saved.no) return saved.no;
  const mine = doc(db, 'leaderboard', uid);
  const counter = doc(db, 'site', 'anonCounter');
  if (Date.now() < anonRetryAt) throw Object.assign(new Error('waiting'), { code: 'app/anon-cooldown' });
  let last: unknown;
  // The SDK retries a transaction that lost a race; a commit judged by the rules against a counter that has already
  // moved comes back as permission-denied instead, so that is retried here as well (with a little jitter).
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const no = await runTransaction(db, async (tx) => {
        const own = await tx.get(mine);
        if (own.exists() && Number(own.data().no) > 0) return Number(own.data().no);
        const c = await tx.get(counter);
        const next = (c.exists() ? Number(c.data().count) || 0 : 0) + 1;
        tx.set(counter, { count: next });
        tx.set(mine, { displayName: `${ANON_NAME} ${next}`, xp, level: levelInfo(xp).level, updatedAt: Date.now(), anon: true, no: next });
        return next;
      });
      localStorage.setItem(ANON_KEY, JSON.stringify({ uid, no }));
      return no;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 200 * 2 ** attempt * (0.5 + Math.random())));
    }
  }
  // Still refused (e.g. the v5.2.8 rules are not published yet): leave it for a few minutes.
  anonRetryAt = Date.now() + 5 * 60000;
  throw last;
}

/** XP an anonymous learner shows on the board: everything earned on this device, minus what an account already took over. */
function anonXp(p: Progress) {
  const x = xpByCourse(p);
  const c = carried();
  return Math.round(Math.max(0, x.zh - c.zh) + Math.max(0, x.en - c.en));
}
export const anonLabel = (no: number, nick?: string) => nick?.trim().slice(0, 20) || `${ANON_NAME} ${no}`;

async function uploadAnon(u: User) {
  if (auth.currentUser?.uid !== u.uid || !u.isAnonymous) return;
  try {
    const no = await anonNumber(u.uid, anonXp(getStored()));
    if (auth.currentUser?.uid !== u.uid || !u.isAnonymous) return;
    const p = getStored();
    const displayName = anonLabel(no, p.settings.name);
    setAccount({ anon: { uid: u.uid, no, name: displayName } });
    const xp = anonXp(p);
    const now = Date.now();
    await setDoc(doc(db, 'leaderboard', u.uid), { displayName, xp, level: levelInfo(xp).level, updatedAt: now, anon: true, no });
    const wxp = Math.min(Math.round(totalWeekXp(p)), xp);
    if (wxp > 0) await setDoc(doc(db, 'weeks', weekId(), 'entries', u.uid), { displayName, xp: wxp, updatedAt: now, anon: true });
  } catch (e) {
    console.warn('Anonymous leaderboard not updated', (e as { code?: string }).code ?? e);
  }
}

function startAnon(u: User) {
  endSession(false);
  const saved = readJson<{ uid?: string; no?: number }>(localStorage, ANON_KEY, {});
  const no = saved.uid === u.uid ? (saved.no ?? 0) : 0;
  setAccount({ anon: { uid: u.uid, no, name: no ? anonLabel(no, getStored().settings.name) : '' } });
  stopAnon = onLocalChange(() => {
    if (anonTimer) clearTimeout(anonTimer);
    anonTimer = setTimeout(() => void uploadAnon(u), 800);
  });
  void uploadAnon(u);
}

function leaveAnon() {
  stopAnon?.();
  stopAnon = null;
  if (anonTimer) clearTimeout(anonTimer);
  anonTimer = null;
}

const restBase = () =>
  `${import.meta.env.VITE_FIREBASE_EMULATOR === '1' ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com'}/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

/** Before leaving an anonymous identity: remember it (with its token) so its board entry can be removed afterwards. */
async function stashAnon() {
  const u = auth.currentUser;
  if (!u?.isAnonymous) return null;
  if (anonTimer) {
    clearTimeout(anonTimer);
    anonTimer = null;
  }
  try {
    sessionStorage.setItem(DROP_KEY, JSON.stringify({ uid: u.uid, token: await u.getIdToken() }));
  } catch {
    /* offline: the entry simply stays */
  }
  return u;
}

/** The anonymous identity was replaced by a real account (link not possible): its XP is merged locally, drop its entries. */
async function dropAnon(realUid: string) {
  const d = readJson<{ uid?: string; token?: string }>(sessionStorage, DROP_KEY, {});
  sessionStorage.removeItem(DROP_KEY);
  if (!d.uid || !d.token || d.uid === realUid) return;
  const headers = { Authorization: `Bearer ${d.token}` };
  for (const path of [`leaderboard/${d.uid}`, `weeks/${weekId()}/entries/${d.uid}`])
    await fetch(`${restBase()}/${path}`, { method: 'DELETE', headers }).catch(() => undefined);
}

async function startSession(u: User) {
  leaveAnon();
  setAccount({ ready: true, user: toUser(u), anon: null, sync: 'saving', notice: '' });
  if (!(await checkRole(u))) return forceLogout(LOCKED_MSG);
  if (auth.currentUser?.uid !== u.uid) return;
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
    carried: carried(),
  });
  if (!progress.settings.name) progress.settings = { ...progress.settings, name: nameOf(u) };
  applyRemote(progress);
  if (migrated) {
    markMigrated(u.uid);
    if (guest) localStorage.setItem(CARRIED_KEY, JSON.stringify({ zh: guest.xp, en: guest.en?.xp ?? 0 }));
  }
  void dropAnon(u.uid);
  setAccount({ migrated, user: { ...toUser(u), displayName: u.displayName || progress.settings.name || nameOf(u) } });

  stopLocal?.();
  stopLocal = onLocalChange(() => scheduleUpload(u));
  void upload(u, progress);
  if (!reachable) setAccount({ sync: 'offline' });
  listen(u);
  startSocial(u.uid, roleInfo.forcedName || getAccount().user?.displayName || nameOf(u, progress));
}

function listen(u: User) {
  stopRole?.();
  stopRole = onSnapshot(
    doc(db, 'roles', u.uid),
    (snap) => {
      const d = snap.exists() ? snap.data() : {};
      if (d.locked) return void forceLogout(LOCKED_MSG);
      const owner = u.email?.toLowerCase() === OWNER_EMAIL && u.emailVerified;
      applyRole({ ...d, role: owner ? 'admin' : d.role });
    },
    (e) => console.warn('Role listener error', e),
  );

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
      applyRemote(timer ? mergeProgress(getStored(), remote) : remote);
    },
    (e) => console.warn('Snapshot error', e),
  );
}

function endSession(signedOut = true) {
  leaveAnon();
  stopSnapshot?.();
  stopSnapshot = null;
  stopRole?.();
  stopRole = null;
  roleInfo = { forcedName: '', hidden: false, revoked: [] };
  profileName = '';
  stopSocial();
  stopLocal?.();
  stopLocal = null;
  if (timer) clearTimeout(timer);
  timer = null;
  switchStorageSlot(GUEST_KEY, loadFrom(GUEST_KEY) ?? defaultProgress());
  setAccount({ ready: true, user: null, sync: 'idle', migrated: false, role: 'user', revoked: [], ...(signedOut ? { anon: null } : {}) });
}

export function initCloud() {
  if (started) return;
  started = true;
  getRedirectResult(auth).catch((e) => console.warn('Redirect sign-in failed', e));
  void loadContent();
  void loadAnnouncement();
  startVisits();
  onAuthStateChanged(auth, (u) => {
    if (u?.isAnonymous) startAnon(u);
    else if (u) void startSession(u);
    else {
      endSession();
      // Learners who are not logged in get an anonymous Firebase identity for the public leaderboard.
      signInAnonymously(auth).catch((e) => console.warn('Anonymous sign-in failed', (e as { code?: string }).code ?? e));
    }
  });
  window.addEventListener('online', () => {
    const u = auth.currentUser;
    if (!u) return;
    if (u.isAnonymous) return void uploadAnon(u);
    // Firestore restarts its own streams on 'online'; re-send the snapshot and escalate only if it stays stuck.
    reconnecting = true;
    pendingSince = 0;
    void upload(u, getStored());
    for (const ms of [2000, 6000, 12000]) setTimeout(kickIfStuck, ms);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && auth.currentUser && !auth.currentUser.isAnonymous) kickIfStuck();
  });
  window.addEventListener('offline', () => {
    if (auth.currentUser && !auth.currentUser.isAnonymous) setAccount({ sync: 'offline' });
  });
}

// ---------- admin-managed content ----------
/** Load lessons/units edited in the admin panel; bundled content is used for anything not in Firestore. */
export async function loadContent() {
  try {
    const [ls, us] = await Promise.all([
      withTimeout(getDocs(collection(db, 'lessons')), 15000),
      withTimeout(getDocs(collection(db, 'units')), 15000),
    ]);
    applyContent({
      lessons: ls.docs.map((d) => ({ ...d.data(), id: d.id }) as LessonDoc),
      units: us.docs.map((d) => ({ ...d.data(), unit: Number(d.id) }) as UnitDoc),
    });
  } catch (e) {
    console.warn('Using bundled/cached lesson content', e);
  }
}

/** "What's new" notice edited in the admin screen (site/announcement); the bundled text is used when there is none. */
export async function loadAnnouncement() {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'site', 'announcement')), 15000);
    setRemoteAnnouncement(snap.exists() ? snap.data() : null);
  } catch (e) {
    console.warn('Using bundled/cached announcement', (e as { code?: string }).code ?? e);
  }
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
  if (code === 'app/locked') return LOCKED_MSG;
  return ERRORS[code] ?? `Có lỗi xảy ra (${code || 'không rõ'}). Vui lòng thử lại.`;
};

export async function registerEmail(name: string, email: string, password: string) {
  pendingName = name.trim().slice(0, 40);
  const anon = await stashAnon();
  // An anonymous learner keeps the same uid: the email account is linked onto it, so XP and history carry over.
  const cred = anon
    ? await linkWithCredential(anon, EmailAuthProvider.credential(email.trim(), password))
    : await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim().slice(0, 40) });
  if (anon) void startSession(cred.user);
  setAccount({ user: toUser(cred.user) });
  updateProgress((p) => ({ ...p, settings: { ...p.settings, name: name.trim().slice(0, 40) } }));
  return cred.user;
}

/** Locked accounts (set by an admin) are signed straight back out. */
async function ensureNotLocked(u: User) {
  const snap = await getDoc(doc(db, 'roles', u.uid)).catch(() => null);
  if (snap?.exists() && snap.data().locked) {
    await signOut(auth);
    throw Object.assign(new Error(LOCKED_MSG), { code: 'app/locked' });
  }
}

export async function loginEmail(email: string, password: string) {
  await stashAnon();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureNotLocked(cred.user);
  return cred;
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const anon = await stashAnon();
  try {
    if (anon)
      try {
        // Link Google onto the anonymous uid so XP, rank and history carry over as they are.
        const linked = await linkWithPopup(anon, provider);
        void startSession(linked.user);
        return linked;
      } catch (e) {
        // This Google account already exists: sign in to it; startSession adds the anonymous XP and drops the anonymous entry.
        const existing = (e as { code?: string }).code === 'auth/credential-already-in-use' ? GoogleAuthProvider.credentialFromError(e as never) : null;
        if (!existing) throw e;
        const cred = await signInWithCredential(auth, existing);
        await ensureNotLocked(cred.user);
        return cred;
      }
    const cred = await signInWithPopup(auth, provider);
    await ensureNotLocked(cred.user);
    return cred;
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
    await upload(u, getStored()).catch(() => undefined);
  }
  await signOut(auth);
}

/** Nickname of an anonymous learner (max 20 characters); empty goes back to the numbered name. */
export function setAnonName(name: string) {
  updateProgress((p) => ({ ...p, settings: { ...p.settings, name: name.trim().slice(0, 20) } }));
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
/** The leaderboard is shared: XP of every course counts. */
const totalWeekXp = (p: Progress) => weekXp(p) + (p.en ? weekXp(courseView(p, 'en')) : 0);

export interface BoardRow {
  uid: string;
  displayName: string;
  xp: number;
  anon: boolean;
}
export interface Board {
  rows: BoardRow[];
  me: { rank: number; xp: number } | null;
}

export async function fetchBoard(kind: 'week' | 'all'): Promise<Board> {
  const col = kind === 'all' ? collection(db, 'leaderboard') : collection(db, 'weeks', weekId(), 'entries');
  const q = query(col, orderBy('xp', 'desc'), limit(100));
  let snap;
  try {
    snap = await withTimeout(getDocsFromServer(q), 10000);
  } catch (e) {
    void kickNetwork();
    snap = await getDocsFromCache(q).catch(() => null);
    if (!snap || snap.empty) throw e;
  }
  const rows = snap.docs.map((d) => ({ uid: d.id, displayName: String(d.data().displayName ?? 'Học viên'), xp: Number(d.data().xp ?? 0), anon: d.data().anon === true }));
  const u = auth.currentUser;
  let me: Board['me'] = null;
  if (u) {
    const all = u.isAnonymous ? anonXp(getStored()) : Math.round(xpByCourse(getStored()).total);
    const xp = kind === 'all' ? all : Math.min(Math.round(totalWeekXp(getStored())), all);
    const idx = rows.findIndex((r) => r.uid === u.uid);
    if (idx >= 0) me = { rank: idx + 1, xp: rows[idx].xp };
    else if (xp > 0) {
      const higher = await withTimeout(getCountFromServer(query(col, where('xp', '>', xp))), 8000).catch(() => null);
      me = higher ? { rank: higher.data().count + 1, xp } : null;
    }
  }
  return { rows, me };
}

// ---------- friends + chat (same lazy chunk as the rest of the Firebase layer) ----------
export * as social from './social';
