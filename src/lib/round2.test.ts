import { beforeAll, describe, expect, it } from 'vitest';
import type { Progress } from '../types';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

let store: typeof import('./store');
let unlock: typeof import('./unlock');
let data: typeof import('../data');
let stats: typeof import('./admin')['computeStats'];
beforeAll(async () => {
  store = await import('./store');
  unlock = await import('./unlock');
  data = await import('../data');
});

const withLevel = (level: Progress['settings']['level']): Progress => {
  const p = store.defaultProgress();
  return { ...p, settings: { ...p.settings, level } };
};

describe('level picker unlocks', () => {
  it('"Chưa biết gì" opens only lesson 1', () => {
    const p = withLevel('new');
    const open = data.CORE_LESSONS.filter((l) => unlock.isUnlocked(p, l)).map((l) => l.id);
    expect(open).toEqual(['l01']);
    expect(unlock.currentLessonId(p)).toBe('l01');
    expect(unlock.isTestUnlocked(p, 1)).toBe(false);
  });
  it('"Biết sơ sơ" opens Part 1 and starts at Part 2', () => {
    const p = withLevel('some');
    const open = data.CORE_LESSONS.filter((l) => unlock.isUnlocked(p, l)).map((l) => l.id);
    expect(open).toEqual(['l01', 'l02', 'l03', 'l04', 'l05', 'l06']);
    expect(unlock.currentLessonId(p)).toBe('l06');
    expect(unlock.isTestUnlocked(p, 1)).toBe(true);
    expect(unlock.isTestUnlocked(p, 2)).toBe(false);
  });
  it('"Đã học rồi" opens every core lesson and test, bonus still needs gems', () => {
    const p = withLevel('done');
    expect(data.CORE_LESSONS.every((l) => unlock.isUnlocked(p, l))).toBe(true);
    expect([1, 2, 3].every((u) => unlock.isTestUnlocked(p, u))).toBe(true);
    expect(data.BONUS_LESSONS.some((l) => unlock.isUnlocked(p, l))).toBe(false);
  });
  it('existing learners skip the picker; new ones see it', () => {
    expect(store.sanitize({ xp: 30, lessons: { l01: { completed: 1, bestAccuracy: 1 } } }).settings.level).toBe('new');
    expect(store.sanitize({ xp: 0, lessons: {} }).settings.level).toBe('');
    expect(store.sanitize({ xp: 0, lessons: {} }).settings.theme).toBe('leaf');
  });
});

describe('admin content overrides', () => {
  it('bundled content is the default: 17 lessons, 181 words', () => {
    expect(data.LESSONS.length).toBe(17);
    expect(data.ALL_WORDS.length).toBe(181);
    expect(data.contentSource).toBe('bundled');
  });
  it('Firestore lessons replace, add and delete; bundled fallback otherwise', () => {
    const l01 = data.BUNDLED_LESSONS[0];
    const words = l01.words.slice(0, 4).map((w) => ({ ...w, id: `h2-${w.id}` }));
    data.applyContent({
      lessons: [
        { ...l01, title: 'Chào hỏi (sửa)' },
        { id: 'l02', deleted: true },
        { id: 'h2-01', title: 'HSK 2', desc: '', icon: '书', unit: 4, order: 1, words },
      ],
      units: [],
    });
    expect(data.LESSON_BY_ID.l01.title).toBe('Chào hỏi (sửa)');
    expect(data.LESSON_BY_ID.l02).toBeUndefined();
    expect(data.LESSON_BY_ID['h2-01'].words[0].lessonId).toBe('h2-01');
    expect(data.UNITS.map((u) => u.unit)).toContain(4);
    expect(data.LESSONS[data.LESSONS.length - 1].id).toBe('h2-01');
    data.applyContent({ lessons: [], units: [] });
    expect(data.LESSONS.length).toBe(17);
    expect(data.ALL_WORDS.length).toBe(181);
  });
});

describe('admin statistics', () => {
  beforeAll(async () => {
    stats = (await import('./admin')).computeStats;
  });
  it('counts learners, active users, completions and hardest lessons', () => {
    const now = new Date(2026, 10, 21, 12);
    const a = store.defaultProgress();
    a.days = { '2026-11-21': 20 };
    a.lessons = { l01: { completed: 2, bestAccuracy: 1 }, l02: { completed: 1, bestAccuracy: 0.8 } } as unknown as Progress['lessons'];
    a.lessonStats = { l02: { fails: 3 } };
    const b = store.defaultProgress();
    b.days = { '2026-11-17': 10 };
    b.lessons = { l01: { completed: 1, bestAccuracy: 1 } } as unknown as Progress['lessons'];
    const user = (progress: Progress | null) => ({ uid: 'x', displayName: '', email: '', createdAt: 0, lastActive: 0, progress, role: 'user' as const, locked: false, hidden: false, forcedName: '', revoked: [] });
    const s = stats([user(a), user(b), user(null)], now);
    expect(s).toMatchObject({ learners: 2, dau: 1, wau: 2, lessonsCompleted: 4 });
    expect(s.hardest[0]).toMatchObject({ id: 'l02', passRate: 0.25 });
  });
});
