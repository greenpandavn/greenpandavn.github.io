import { beforeAll, describe, expect, it } from 'vitest';
import type { Progress } from '../types';
import { hasProgress, mergeProgress, resolveLogin, weekId, weekXp } from './merge';

// store.ts reads localStorage on import – give it an in-memory one.
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
let defaultProgress: () => Progress;
let sanitize: (raw: unknown) => Progress;
beforeAll(async () => {
  ({ defaultProgress, sanitize } = await import('./store'));
});

const make = (patch: Partial<Progress>): Progress => ({ ...defaultProgress(), ...patch });

describe('mergeProgress', () => {
  it('keeps the higher XP, gems and streak', () => {
    const cloud = make({ xp: 120, gems: 40, streak: { current: 2, longest: 5, lastDate: '2026-11-20' } });
    const guest = make({ xp: 300, gems: 90, streak: { current: 7, longest: 7, lastDate: '2026-11-21' } });
    const m = mergeProgress(cloud, guest);
    expect(m.xp).toBe(300);
    expect(m.gems).toBe(90);
    expect(m.streak).toEqual({ current: 7, longest: 7, lastDate: '2026-11-21' });
  });

  it('unions lessons, achievements, certificates and keeps the best of each', () => {
    const cloud = make({
      lessons: { l1: { completed: 1, bestAccuracy: 0.7 } },
      achievements: { first: '2026-11-01' },
      certificates: [{ id: 'hsk1-part1', unit: 1, part: 'P1', name: 'A', score: 80, correct: 8, total: 10, date: '2026-11-02' }],
      unlockedBonus: ['b1'],
    });
    const guest = make({
      lessons: { l1: { completed: 3, bestAccuracy: 0.5 }, l2: { completed: 1, bestAccuracy: 1 } },
      achievements: { first: '2026-10-30', xp100: '2026-11-05' },
      certificates: [
        { id: 'hsk1-part1', unit: 1, part: 'P1', name: 'A', score: 100, correct: 10, total: 10, date: '2026-11-03' },
        { id: 'hsk1-part2', unit: 2, part: 'P2', name: 'A', score: 90, correct: 9, total: 10, date: '2026-11-04' },
      ],
      unlockedBonus: ['b2'],
    });
    const m = mergeProgress(cloud, guest);
    expect(m.lessons.l1).toEqual({ completed: 3, bestAccuracy: 0.7 });
    expect(m.lessons.l2.completed).toBe(1);
    expect(m.achievements).toEqual({ first: '2026-10-30', xp100: '2026-11-05' });
    expect(m.certificates.map((c) => [c.id, c.score])).toEqual([
      ['hsk1-part1', 100],
      ['hsk1-part2', 90],
    ]);
    expect(m.unlockedBonus.sort()).toEqual(['b1', 'b2']);
  });

  it('keeps the most recently practised state per word and max XP per day', () => {
    const w = (lastSeen: number, strength: number) => ({ strength, correct: 1, wrong: 0, lastSeen, due: 0, lastWrong: 0 });
    const cloud = make({ words: { a: w(100, 3), b: w(500, 1) }, days: { '2026-11-20': 30 } });
    const guest = make({ words: { a: w(200, 1), c: w(50, 2) }, days: { '2026-11-20': 10, '2026-11-21': 25 } });
    const m = mergeProgress(cloud, guest);
    expect(m.words.a.lastSeen).toBe(200);
    expect(m.words.b.lastSeen).toBe(500);
    expect(m.words.c).toBeDefined();
    expect(m.days).toEqual({ '2026-11-20': 30, '2026-11-21': 25 });
  });

  it('prefers the primary (cloud) settings but keeps a guest name when cloud has none', () => {
    const cloud = make({ settings: { ...defaultProgress().settings, rate: 1, name: '' } });
    const guest = make({ settings: { ...defaultProgress().settings, rate: 0.6, name: 'Lan' } });
    const m = mergeProgress(cloud, guest);
    expect(m.settings.rate).toBe(1);
    expect(m.settings.name).toBe('Lan');
  });

  it('handles old v1 snapshots that lack the new fields', () => {
    const old = sanitize({ xp: 50, lessons: { l1: { completed: 1, bestAccuracy: 1 } }, settings: { sound: false } });
    expect(old.certificates).toEqual([]);
    expect(old.tests).toEqual([]);
    expect(old.settings.reminderTime).toBe('19:00');
    expect(old.settings.sound).toBe(false);
    expect(mergeProgress(make({ xp: 10 }), old).xp).toBe(50);
  });
});

describe('resolveLogin (localStorage → cloud migration)', () => {
  const guest = () => make({ xp: 200, lessons: { l1: { completed: 1, bestAccuracy: 1 } }, streak: { current: 3, longest: 3, lastDate: '2026-11-21' } });

  it('first login on a new account uploads the guest progress', () => {
    const r = resolveLogin({ cloud: null, cache: null, guest: guest(), alreadyMigrated: false, fallback: defaultProgress() });
    expect(r.migrated).toBe(true);
    expect(r.progress.xp).toBe(200);
    expect(r.progress.lessons.l1).toBeDefined();
  });

  it('first login on an existing account merges: guest XP is added (v5.2.8), higher streak kept', () => {
    const cloud = make({ xp: 500, streak: { current: 1, longest: 10, lastDate: '2026-11-19' }, lessons: { l2: { completed: 2, bestAccuracy: 0.9 } } });
    const r = resolveLogin({ cloud, cache: null, guest: guest(), alreadyMigrated: false, fallback: defaultProgress() });
    expect(r.migrated).toBe(true);
    expect(r.progress.xp).toBe(700);
    expect(r.progress.streak.current).toBe(3);
    expect(r.progress.streak.longest).toBe(10);
    expect(Object.keys(r.progress.lessons).sort()).toEqual(['l1', 'l2']);
  });

  it('does not merge guest data twice for the same account', () => {
    const cloud = make({ xp: 50 });
    const r = resolveLogin({ cloud, cache: null, guest: guest(), alreadyMigrated: true, fallback: defaultProgress() });
    expect(r.migrated).toBe(false);
    expect(r.progress.xp).toBe(50);
  });

  it('empty guest progress is not migrated', () => {
    const r = resolveLogin({ cloud: make({ xp: 5 }), cache: null, guest: defaultProgress(), alreadyMigrated: false, fallback: defaultProgress() });
    expect(r.migrated).toBe(false);
    expect(hasProgress(defaultProgress())).toBe(false);
  });

  it('offline login uses the account cache; pending offline edits survive the next cloud read', () => {
    const cache = make({ xp: 340 });
    const offline = resolveLogin({ cloud: null, cache, guest: null, alreadyMigrated: true, fallback: defaultProgress() });
    expect(offline.progress.xp).toBe(340);
    const online = resolveLogin({ cloud: make({ xp: 300 }), cache, guest: null, alreadyMigrated: true, fallback: defaultProgress() });
    expect(online.progress.xp).toBe(340);
  });
});

describe('weekly leaderboard helpers', () => {
  it('computes ISO week ids', () => {
    expect(weekId(new Date(2026, 10, 21))).toBe('2026-W47');
    expect(weekId(new Date(2026, 0, 1))).toBe('2026-W01');
    expect(weekId(new Date(2027, 0, 1))).toBe('2026-W53');
  });
  it('sums XP from Monday to Sunday of the current week only', () => {
    const p = make({ days: { '2026-11-15': 99, '2026-11-16': 10, '2026-11-21': 20, '2026-11-22': 5 } });
    expect(weekXp(p, new Date(2026, 10, 21))).toBe(35);
  });
});
