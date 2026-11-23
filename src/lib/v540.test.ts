import { describe, expect, it } from 'vitest';
import { addMonths, endOfDay, extendVip, needsVip, vipActive, vipCourse } from './vip';

const user = { uid: 'u', email: 'a@b.c', displayName: 'A', photoURL: null, provider: 'password' };
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('v5.4.0 VIP', () => {
  it('gates Korean and Japanese entirely, English from level 3, Chinese from HSK 6', () => {
    for (const lv of [1, 2, 3, 4, 5, 6]) expect(needsVip('ko', lv)).toBe(true);
    for (const lv of [1, 2, 3, 4, 5]) expect(needsVip('ja', lv)).toBe(true);
    expect([1, 2, 3, 4, 5].map((lv) => needsVip('en', lv))).toEqual([false, false, true, true, true]);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((lv) => needsVip('zh', lv))).toEqual([false, false, false, false, false, true, true, true, true]);
    expect(['zh', 'en', 'ko', 'ja'].map((c) => vipCourse(c as 'zh'))).toEqual([false, false, true, true]);
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
