import { describe, expect, it } from 'vitest';
import { addMonths, cleanVipParts, defaultPartVip, endOfDay, extendVip, levelAllVip, levelHasVip, partVip, setVipParts, vipActive, vipCourse, vipOverrides, withPartVip } from './vip';
import { courseUnits, levelUnits } from '../data';

const user = { uid: 'u', email: 'a@b.c', displayName: 'A', photoURL: null, provider: 'password' };
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('v5.4.0 VIP', () => {
  it('v5.6.0 defaults: Korean and Japanese free for their first four parts, English VIP from level 3, Chinese from HSK 6', () => {
    setVipParts(null);
    for (const c of ['ko', 'ja'] as const) {
      const units = courseUnits(c).map((u) => u.unit);
      expect(units.filter((u) => !partVip(c, u))).toEqual([1, 2, 3, 4]);
      expect(levelHasVip(c, 1)).toBe(true); // the mock test of the first level stays VIP
      expect(levelAllVip(c, 1)).toBe(false);
      expect(levelAllVip(c, 2)).toBe(true);
    }
    expect([1, 2, 3, 4, 5].map((lv) => levelUnits(lv, 'en').every((u) => partVip('en', u)))).toEqual([false, false, true, true, true]);
    expect([1, 2, 3, 4, 5].map((lv) => levelHasVip('en', lv))).toEqual([false, false, true, true, true]);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((lv) => levelHasVip('zh', lv))).toEqual([false, false, false, false, false, true, true, true, true]);
    expect(['zh', 'en', 'ko', 'ja'].map((c) => vipCourse(c as 'zh'))).toEqual([false, false, false, false]);
  });

  it('v5.6.0 admin switches override the defaults part by part and drop out when set back', () => {
    setVipParts(null);
    let parts = withPartVip(vipOverrides(), 'ko', 5, false);
    parts = withPartVip(parts, 'ko', 1, true);
    parts = withPartVip(parts, 'en', 1, true);
    expect(parts).toEqual({ ko: { 5: false, 1: true }, en: { 1: true } });
    setVipParts(parts);
    expect(partVip('ko', 5)).toBe(false);
    expect(partVip('ko', 1)).toBe(true);
    expect(partVip('ko', 6)).toBe(true);
    expect(partVip('en', 1)).toBe(true);
    expect(partVip('ja', 5)).toBe(true);
    // back to the default: the override disappears
    parts = withPartVip(withPartVip(withPartVip(parts, 'ko', 5, true), 'ko', 1, false), 'en', 1, false);
    expect(parts).toEqual({});
    // every part of a course switched on closes the course as a whole
    let all = {};
    for (const u of courseUnits('ja')) all = withPartVip(all, 'ja', u.unit, true);
    setVipParts(all);
    expect(vipCourse('ja')).toBe(true);
    expect(defaultPartVip('ja', 1)).toBe(false);
    // junk from Firestore is ignored
    expect(cleanVipParts({ ko: { 5: 'no', x: true, 7: false }, xx: { 1: true }, ja: 3 })).toEqual({ ko: { 7: false } });
    setVipParts(null);
  });

  it('VIP needs a signed-in account and lapses by itself at the expiry time', () => {
    const now = at(2026, 11, 24);
    expect(vipActive({ user, role: 'user', vipUntil: now + 1000 }, now)).toBe(true);
    expect(vipActive({ user, role: 'user', vipUntil: now }, now)).toBe(false);
    expect(vipActive({ user, role: 'user', vipUntil: now - 1 }, now)).toBe(false);
    expect(vipActive({ user, role: 'user', vipUntil: 0 }, now)).toBe(false);
    expect(vipActive({ user: null, role: 'user', vipUntil: now + 1000 }, now)).toBe(false);
    expect(vipActive({ user, role: 'admin', vipUntil: 0 }, now)).toBe(true);
  });

  it('terms are calendar months and a renewal continues from the current expiry', () => {
    expect(addMonths(at(2026, 11, 24), 1)).toBe(at(2026, 12, 24));
    expect(addMonths(at(2026, 11, 24), 3)).toBe(at(2027, 2, 24));
    expect(addMonths(at(2026, 11, 24), 12)).toBe(at(2027, 11, 24));
    expect(addMonths(at(2027, 1, 31), 1)).toBe(at(2027, 2, 28));
    const now = at(2026, 11, 24);
    expect(extendVip(0, 1, now)).toBe(at(2026, 12, 24));
    expect(extendVip(at(2026, 10, 1), 6, now)).toBe(at(2027, 5, 24)); // lapsed: from today
    expect(extendVip(at(2026, 12, 24), 3, now)).toBe(at(2027, 3, 24)); // running: added on top
  });

  it('an exact expiry date runs to the end of that day', () => {
    const t = endOfDay('2027-01-15');
    expect(new Date(t).getDate()).toBe(15);
    expect(new Date(t + 1).getDate()).toBe(16);
    expect(endOfDay('')).toBe(0);
    expect(endOfDay('15/01/2027')).toBe(0);
  });
});
