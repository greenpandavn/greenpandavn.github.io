import { useEffect, useState } from 'react';
import { useAccount, type AccountState } from './account';
import type { CourseId } from '../types';

/**
 * VIP content (v5.4.0): all of Korean and Japanese, English from 'Nâng cao' (level 3) on, Chinese from HSK 6 on.
 * It is a second layer on top of the login gate of lib/gate.ts.
 */
export const needsVip = (course: CourseId, level: number) =>
  course === 'ko' || course === 'ja' || (course === 'en' ? level >= 3 : level >= 6);
/** True when the whole course is VIP-only. */
export const vipCourse = (course: CourseId) => needsVip(course, 1);

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
