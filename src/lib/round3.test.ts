import { beforeAll, describe, expect, it } from 'vitest';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

let store: typeof import('./store');
let data: typeof import('../data');
let merge: typeof import('./merge');
let ex: typeof import('./exercises');
let unlock: typeof import('./unlock');
let game: typeof import('./gamification');
beforeAll(async () => {
  store = await import('./store');
  data = await import('../data');
  merge = await import('./merge');
  ex = await import('./exercises');
  unlock = await import('./unlock');
  game = await import('./gamification');
});

describe('v3 content', () => {
  it('Chinese course has HSK 1–3 with tests per part', () => {
    data.setCourse('zh');
    const count = (lv: number) => data.LESSONS.filter((l) => data.unitLevel(l.unit) === lv).flatMap((l) => l.words).length;
    expect([count(1), count(2), count(3)]).toEqual([181, 144, 287]);
    expect(data.UNITS.map((u) => u.unit)).toEqual([1, 2, 3, 21, 22, 23, 31, 32, 33, 34]);
    for (const w of data.ALL_WORDS) {
      expect(w.pinyin, w.hanzi).toBeTruthy();
      expect(w.ex.tokens.length, w.hanzi).toBe(w.ex.py.length);
      expect(w.ex.py.every(Boolean), w.hanzi).toBe(true);
    }
    expect(new Set(data.ALL_WORDS.map((w) => w.id)).size).toBe(data.ALL_WORDS.length);
  });
  it('English course: 30 lessons, 371 words, every lesson builds a full exercise queue', () => {
    data.setCourse('en');
    expect(data.LESSONS.length).toBe(30);
    expect(data.ALL_WORDS.length).toBe(371);
    for (const l of data.LESSONS) {
      const q = ex.buildLesson(l.words, { difficulty: 'normal', newWordIds: new Set(l.words.map((w) => w.id)), speaking: true });
      const kinds = new Set(q.map((e) => e.kind));
      for (const k of ['intro', 'listen', 'meaning', 'char', 'type', 'match', 'arrange', 'speak']) expect(kinds.has(k as never), `${l.id} ${k}`).toBe(true);
      for (const e of q) if (e.kind === 'listen' || e.kind === 'char') expect(new Set(e.options.map((o) => o.hanzi)).size, l.id).toBeGreaterThanOrEqual(3);
    }
    const w = data.WORD_BY_ID['e01-hello'];
    expect(data.sentenceZh(w)).toBe('Hello, how are you?');
    expect(data.sentenceKey('hello how are you')).toBe(data.sentenceKey(data.sentenceZh(w)));
    data.setCourse('zh');
  });
  it('every Chinese lesson builds a full exercise queue', () => {
    data.setCourse('zh');
    for (const l of data.LESSONS) {
      const q = ex.buildLesson(l.words, { difficulty: 'hard', newWordIds: new Set(), speaking: true });
      const kinds = new Set(q.map((e) => e.kind));
      for (const k of ['listen', 'meaning', 'char', 'type', 'match', 'arrange', 'speak']) expect(kinds.has(k as never), `${l.id} ${k}`).toBe(true);
    }
    for (const u of data.UNITS) expect(ex.buildTest(data.CORE_LESSONS.filter((l) => l.unit === u.unit).flatMap((l) => l.words)).length).toBe(10);
  });
});

describe('per-course progress', () => {
  it('XP, lessons, streak are separate; gems and settings are shared', () => {
    store.resetProgress();
    data.setCourse('zh');
    store.addXp(30);
    store.completeLesson('l01', 1);
    store.addGems(7);
    const gems = store.getProgress().gems;

    data.setCourse('en');
    expect(store.getProgress().xp).toBe(0);
    expect(store.getProgress().lessons).toEqual({});
    expect(store.getProgress().streak.current).toBe(0);
    expect(store.getProgress().gems).toBe(gems);
    expect(store.getProgress().settings.level).toBe('');
    unlock.setLevel('new');
    store.addXp(12);
    store.completeLesson('e01', 0.9);
    store.addGems(3);
    expect(store.getProgress().xp).toBe(12);
    expect(store.getProgress().streak.current).toBe(1);

    data.setCourse('zh');
    expect(store.getProgress().xp).toBe(30);
    expect(Object.keys(store.getProgress().lessons)).toEqual(['l01']);
    expect(store.getProgress().gems).toBe(gems + 3);
    expect(store.xpByCourse()).toEqual({ zh: 30, en: 12, total: 42 });

    // stored form: Chinese at the top level (readable by v2), English under `en`
    const saved = JSON.parse(mem.get(store.GUEST_KEY)!);
    expect(saved.xp).toBe(30);
    expect(saved.en.xp).toBe(12);
    expect(Object.keys(saved.en.lessons)).toEqual(['e01']);
    expect(store.sanitize(saved).en?.level).toBe('new');
  });
  it('certificates get level-aware ids', () => {
    data.setCourse('zh');
    expect(store.recordTest(1, 'p', 'A', 9, 10).cert?.id).toBe('hsk1-part1');
    expect(store.recordTest(22, 'p', 'A', 9, 10).cert?.id).toBe('hsk2-part22');
    expect(store.recordTest(31, 'p', 'A', 10, 10).cert?.id).toBe('hsk3-part31');
    data.setCourse('en');
    expect(store.recordTest(1, 'p', 'A', 8, 10).cert?.id).toBe('en-part1');
    expect(store.getProgress().certificates.map((c) => c.id)).toEqual(['en-part1']);
    data.setCourse('zh');
    expect(store.getProgress().certificates.length).toBe(3);
  });
  it('merging keeps both courses', () => {
    const a = store.defaultProgress();
    a.xp = 50;
    const b = store.defaultProgress();
    b.xp = 20;
    b.en = { ...store.coursePart(store.defaultProgress()), xp: 15, level: 'new', lessons: { e01: { completed: 1, bestAccuracy: 1 } } };
    const m = merge.mergeProgress(a, b);
    expect(m.xp).toBe(50);
    expect(m.en?.xp).toBe(15);
    expect(merge.hasProgress({ ...store.defaultProgress(), en: b.en })).toBe(true);
    const a2 = { ...a, en: { ...b.en!, xp: 40, lessons: { e02: { completed: 2, bestAccuracy: 0.5 } } } };
    const m2 = merge.mergeProgress(a2, b);
    expect(m2.en?.xp).toBe(40);
    expect(Object.keys(m2.en!.lessons).sort()).toEqual(['e01', 'e02']);
    expect(m2.en?.level).toBe('new');
  });
  it('badges differ per course', () => {
    data.setCourse('zh');
    expect(game.achievements().map((a) => a.id)).toContain('hsk3');
    data.setCourse('en');
    expect(game.achievements().map((a) => a.id)).not.toContain('hsk2');
    expect(game.achievements().find((a) => a.id === 'course')?.title).toContain('tiếng Anh');
    data.setCourse('zh');
  });
});
