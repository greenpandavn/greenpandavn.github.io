import { useEffect, useState, useSyncExternalStore } from 'react';
import { COURSE_IDS, courseUnits, levelUnits } from '../data';
import { useAccount, type AccountState } from './account';
import type { CourseId } from '../types';

/**
 * VIP content is decided part by part (v5.6.0). The defaults below apply until an admin flips a switch in the admin
 * screen; the switches are stored in Firestore (config/vipParts) as overrides of these defaults and reach every learner
 * live. VIP is a second layer on top of the login gate of lib/gate.ts.
 * Defaults: Korean, Japanese and Thai are free for their first four parts; English is VIP from 'Nâng cao' (level 3) on,
 * Chinese from HSK 6 on.
 */
export type VipParts = Partial<Record<CourseId, Record<string, boolean>>>;
export const FREE_FIRST_PARTS = 4;
export function defaultPartVip(course: CourseId, unit: number) {
  const units = courseUnits(course);
  if (course === 'zh' || course === 'en') {
    const level = units.find((u) => u.unit === unit)?.level ?? 1;
    return level >= (course === 'en' ? 3 : 6);
  }
  return !units.slice(0, FREE_FIRST_PARTS).some((u) => u.unit === unit);
}

const CACHE_KEY = 'gp-vip-parts';
export function cleanVipParts(raw: unknown): VipParts {
  const out: VipParts = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const c of COURSE_IDS) {
    const m = (raw as Record<string, unknown>)[c];
    if (!m || typeof m !== 'object') continue;
    const o: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(m)) if (/^\d+$/.test(k) && typeof v === 'boolean') o[k] = v;
    if (Object.keys(o).length) out[c] = o;
  }
  return out;
}
let overrides: VipParts = (() => {
  try {
    return cleanVipParts(JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'));
  } catch {
    return {};
  }
})();
let partsVersion = 0;
const partListeners = new Set<() => void>();
/** Called by the cloud layer with the `parts` map of config/vipParts (null when there is none). */
export function setVipParts(raw: unknown) {
  overrides = cleanVipParts(raw);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(overrides));
  } catch {
    /* private mode */
  }
  partsVersion++;
  partListeners.forEach((l) => l());
}
export const vipOverrides = () => overrides;
/** The overrides after setting one part: a switch back to the default is dropped, so later default changes still apply. */
export function withPartVip(parts: VipParts, course: CourseId, unit: number, vip: boolean): VipParts {
  const m = { ...(parts[course] ?? {}) };
  if (vip === defaultPartVip(course, unit)) delete m[unit];
  else m[unit] = vip;
  const next = { ...parts, [course]: m };
  if (!Object.keys(m).length) delete next[course];
  return next;
}
/** Re-renders when an admin changes a switch. */
export const useVipParts = () =>
  useSyncExternalStore(
    (l) => {
      partListeners.add(l);
      return () => partListeners.delete(l);
    },
    () => partsVersion,
  );

/** Whether a part (unit) of a course needs VIP. */
export const partVip = (course: CourseId, unit: number, parts: VipParts = overrides) =>
  parts[course]?.[unit] ?? defaultPartVip(course, unit);
/** Mock tests cover a whole level: they need VIP as soon as one part of the level does. */
export const levelHasVip = (course: CourseId, level: number) => levelUnits(level, course).some((u) => partVip(course, u));
/** True when every part of the level needs VIP. */
export const levelAllVip = (course: CourseId, level: number) => {
  const units = levelUnits(level, course);
  return units.length > 0 && units.every((u) => partVip(course, u));
};
/** True when the whole course is VIP-only (its games, reviews and word list are closed too). */
export const vipCourse = (course: CourseId) => courseUnits(course).every((u) => partVip(course, u.unit));

/** VIP runs until `vipUntil` (ms since epoch, set by an admin in roles/{uid}); it lapses by itself. Admins always have it. */
export const vipActive = (acc: Pick<AccountState, 'user' | 'role' | 'vipUntil'>, now = Date.now()) =>
  !!acc.user && (acc.role === 'admin' || acc.vipUntil > now);

/** `months` calendar months after `from` (31 Jan + 1 month = end of February). */
export function addMonths(from: number, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.getTime();
}
/** A renewal starts from the current expiry when VIP is still running, from now otherwise. */
export const extendVip = (until: number, months: number, now = Date.now()) => addMonths(Math.max(until, now), months);
/** End of the given local day (YYYY-MM-DD), 0 when the text is not a date. */
export function endOfDay(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return 0;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999).getTime();
  return Number.isFinite(t) ? t : 0;
}
export const fmtVipDate = (t: number) => new Date(t).toLocaleDateString('vi-VN');

/** Whether the signed-in account has VIP right now; re-renders at the moment it runs out. */
export function useVip() {
  const acc = useAccount();
  const [, tick] = useState(0);
  useEffect(() => {
    const left = acc.vipUntil - Date.now();
    if (left <= 0) return;
    const t = setTimeout(() => tick((n) => n + 1), Math.min(left + 500, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [acc.vipUntil]);
  return vipActive(acc);
}
