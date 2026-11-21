import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { weekId } from './merge';
import { certKey } from './account';
export { certKey };
import { sanitize } from './store';
import { BUNDLED_LESSONS, BUNDLED_UNITS, type RawLesson, type Unit } from '../data';
import type { Progress } from '../types';

export interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  createdAt: number;
  lastActive: number;
  progress: Progress | null;
  role: 'admin' | 'user';
  locked: boolean;
  hidden: boolean;
  forcedName: string;
  revoked: string[];
}

/** All users with their role/moderation state (admins only – enforced by firestore.rules). */
export async function listUsers(): Promise<AdminUser[]> {
  const [us, rs] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'roles'))]);
  const roles = new Map(rs.docs.map((d) => [d.id, d.data()]));
  const ids = new Set([...us.docs.map((d) => d.id), ...roles.keys()]);
  const users = new Map(us.docs.map((d) => [d.id, d.data()]));
  return [...ids].map((uid) => {
    const u = users.get(uid) ?? {};
    const r = roles.get(uid) ?? {};
    let progress: Progress | null = null;
    try {
      progress = u.progress ? sanitize(u.progress) : null;
    } catch {
      progress = null;
    }
    return {
      uid,
      displayName: String(r.forcedName || u.displayName || 'Học viên'),
      email: String(u.email || r.email || ''),
      createdAt: Number(u.createdAt || 0),
      lastActive: Number(u.lastActive || u.updatedAt || 0),
      progress,
      role: r.role === 'admin' ? 'admin' : 'user',
      locked: r.locked === true,
      hidden: r.hidden === true,
      forcedName: String(r.forcedName || ''),
      revoked: Array.isArray(r.revoked) ? r.revoked : [],
    };
  });
}

const role = (uid: string) => doc(db, 'roles', uid);
const touch = () => ({ updatedAt: Date.now() });

export const setLocked = (uid: string, locked: boolean) => setDoc(role(uid), { locked, ...touch() }, { merge: true });
export const setRole = (uid: string, r: 'admin' | 'user') => setDoc(role(uid), { role: r, ...touch() }, { merge: true });

/** Moderation: force a display name (the user's app adopts it and cannot write another to the boards). */
export async function renameUser(uid: string, name: string) {
  const clean = name.trim().slice(0, 40);
  if (!clean) return;
  await setDoc(role(uid), { forcedName: clean, ...touch() }, { merge: true });
  await Promise.all(
    [doc(db, 'leaderboard', uid), doc(db, 'weeks', weekId(), 'entries', uid)].map((r) =>
      updateDoc(r, { displayName: clean }).catch(() => undefined),
    ),
  );
}
export const clearForcedName = (uid: string) => setDoc(role(uid), { forcedName: '', ...touch() }, { merge: true });

/** Remove a user's entries from the leaderboards (and keep them off until shown again). */
export async function setHidden(uid: string, hidden: boolean) {
  await setDoc(role(uid), { hidden, ...touch() }, { merge: true });
  if (hidden) await Promise.all([deleteDoc(doc(db, 'leaderboard', uid)), deleteDoc(doc(db, 'weeks', weekId(), 'entries', uid))]);
}

export const revokeCert = (uid: string, key: string) => setDoc(role(uid), { revoked: arrayUnion(key), ...touch() }, { merge: true });
export const restoreCert = (uid: string, key: string) => setDoc(role(uid), { revoked: arrayRemove(key), ...touch() }, { merge: true });

// ---------- content ----------
const bundledLesson = (id: string) => BUNDLED_LESSONS.some((l) => l.id === id);
export const saveLesson = (l: RawLesson) => setDoc(doc(db, 'lessons', l.id), JSON.parse(JSON.stringify(l)));
/** Delete a lesson: custom lessons are removed; bundled ones are hidden with a tombstone. */
export const deleteLesson = (id: string) =>
  bundledLesson(id) ? setDoc(doc(db, 'lessons', id), { id, deleted: true }) : deleteDoc(doc(db, 'lessons', id));
/** Drop the Firestore copy so the bundled original is used again. */
export const restoreLesson = (id: string) => deleteDoc(doc(db, 'lessons', id));
export const saveUnit = (u: Unit) => setDoc(doc(db, 'units', String(u.unit)), u);
export const deleteUnit = (unit: number) =>
  BUNDLED_UNITS.some((u) => u.unit === unit) ? setDoc(doc(db, 'units', String(unit)), { unit, deleted: true }) : deleteDoc(doc(db, 'units', String(unit)));

// ---------- statistics ----------
export interface Stats {
  learners: number;
  dau: number;
  wau: number;
  lessonsCompleted: number;
  certificates: number;
  hardest: { id: string; completed: number; fails: number; passRate: number }[];
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function computeStats(users: AdminUser[], now = new Date()): Stats {
  const today = dayKey(now);
  const week = new Set(Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getTime() - i * 86400000))));
  const per = new Map<string, { completed: number; fails: number }>();
  let dau = 0;
  let wau = 0;
  let lessonsCompleted = 0;
  let certificates = 0;
  for (const u of users) {
    const p = u.progress;
    if (!p) continue;
    const days = Object.keys(p.days);
    if (days.includes(today)) dau++;
    if (days.some((d) => week.has(d))) wau++;
    certificates += p.certificates.length;
    for (const [id, lp] of Object.entries(p.lessons)) {
      lessonsCompleted += lp.completed;
      const s = per.get(id) ?? { completed: 0, fails: 0 };
      s.completed += lp.completed;
      per.set(id, s);
    }
    for (const [id, ls] of Object.entries(p.lessonStats)) {
      const s = per.get(id) ?? { completed: 0, fails: 0 };
      s.fails += ls.fails;
      per.set(id, s);
    }
  }
  const hardest = [...per.entries()]
    .map(([id, s]) => ({ id, ...s, passRate: s.completed + s.fails ? s.completed / (s.completed + s.fails) : 1 }))
    .filter((x) => x.completed + x.fails > 0)
    .sort((a, b) => a.passRate - b.passRate || b.fails - a.fails)
    .slice(0, 5);
  return { learners: users.filter((u) => u.progress).length, dau, wau, lessonsCompleted, certificates, hardest };
}
