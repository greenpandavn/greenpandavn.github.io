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
  await Promise.all([data.loadCourse('zh'), data.loadCourse('en')]);
  merge = await import('./merge');
  ex = await import('./exercises');
  unlock = await import('./unlock');
  game = await import('./gamification');
});

describe('v3 content', () => {
  it('Chinese course has HSK 1–3 with tests per part', () => {
    data.setCourse('zh');
    const count = (lv: number) => data.LESSONS.filter((l) => data.unitLevel(l.unit) === lv).flatMap((l) => l.words).length;
    expect([count(1), count(2), count(3), count(4), count(5), count(6), count(7), count(8), count(9)]).toEqual([181, 144, 287, 596, 1300, 2500, 1800, 1800, 450]);
    expect(data.CORE_LESSONS.filter((l) => data.unitLevel(l.unit) === 9).length).toBe(38);
    expect(data.CORE_LESSONS.filter((l) => data.unitLevel(l.unit) === 8).length).toBe(150);
    expect(data.CORE_LESSONS.filter((l) => data.unitLevel(l.unit) === 7).length).toBe(151);
    expect(data.UNITS.map((u) => u.unit).slice(0, 22)).toEqual([1, 2, 3, 21, 22, 23, 31, 32, 33, 34, 41, 42, 43, 44, 51, 52, 53, 54, 55, 56, 57, 58]);
    for (const w of data.ALL_WORDS) {
      expect(w.pinyin, w.hanzi).toBeTruthy();
      expect(w.ex.tokens.length, w.hanzi).toBe(w.ex.py.length);
      expect(w.ex.py.every(Boolean), w.hanzi).toBe(true);
    }
    expect(new Set(data.ALL_WORDS.map((w) => w.id)).size).toBe(data.ALL_WORDS.length);
  });
  it('English course: 407 lessons, 4895 words, every lesson builds a full exercise queue', () => {
    data.setCourse('en');
    expect(data.LESSONS.length).toBe(407);
    expect(data.ALL_WORDS.length).toBe(4895);
    expect(data.LESSONS.filter((l) => data.unitLevel(l.unit) === 1).flatMap((l) => l.words).length).toBe(959);
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

describe('v4.5: Thi thử tiếng Anh', () => {
  it('papers have vocabulary, grammar, reading and listening sections and score per section', async () => {
    const mock = await import('./mock');
    const specs = mock.mockSpecs('en');
    expect(specs.map((s) => [s.id, mock.questionCount(s), s.minutes, mock.maxScore(s), s.pass])).toEqual([
      ['en1', 60, 45, 400, 240],
      ['en2', 80, 60, 400, 240],
      ['en3', 100, 75, 400, 240],
      ['en4', 100, 90, 400, 240],
    ]);
    for (const spec of specs) {
      expect(spec.sections.map((s) => s.id)).toEqual(['listening', 'vocab', 'grammar', 'reading']);
      const qs = mock.buildMock(spec);
      expect(qs.length).toBe(mock.questionCount(spec));
      for (const q of qs) {
        expect(q.kind).toBe('choice');
        expect(new Set(q.options).size, `${spec.id}#${q.n} ${q.options}`).toBe(q.options.length);
        expect(q.options[q.answer]).toBe(q.solution);
        expect(q.explain.length).toBeGreaterThan(10);
        expect(/\p{Script=Han}/u.test(`${q.prompt ?? ''}${q.audio ?? ''}${q.options.join('')}`)).toBe(false);
      }
      const grammar = qs.filter((q) => q.section === 'grammar');
      expect(new Set(grammar.map((q) => q.prompt)).size).toBe(grammar.length); // no repeated item
      expect(grammar.every((q) => q.prompt!.includes('___'))).toBe(true);
      const reading = qs.filter((q) => q.section === 'reading');
      expect(reading.every((q) => (q.passage ?? '').length > 80)).toBe(true);
      expect(new Set(reading.map((q) => q.passage + q.prompt!)).size).toBe(reading.length);
      expect(qs.filter((q) => q.section === 'listening').every((q) => !!q.audio)).toBe(true);

      const right = qs.map((q) => q.answer);
      expect(mock.scoreMock(spec, qs, right).score).toBe(400);
      // only the grammar section right: 100 of 400, not passed
      const onlyGrammar = mock.scoreMock(spec, qs, qs.map((q) => (q.section === 'grammar' ? q.answer : undefined)));
      expect(onlyGrammar.sections.map((s) => s.score)).toEqual([0, 0, 100, 0]);
      expect(onlyGrammar.passed).toBe(false);
      // 60% of every section reaches the pass mark exactly
      const seen: Record<string, number> = {};
      const sixty = qs.map((q) => {
        const total = qs.filter((x) => x.section === q.section).length;
        seen[q.section] = (seen[q.section] ?? 0) + 1;
        return seen[q.section] <= total * 0.6 ? q.answer : (q.answer + 1) % q.options.length;
      });
      const r = mock.scoreMock(spec, qs, sixty);
      expect(r.score).toBe(240);
      expect(r.passed).toBe(true);
    }
  });
  it('every bank item has one right answer and distinct options; results are stored per paper', async () => {
    const { GRAMMAR, READING } = await import('../data/enMock');
    for (const lv of [1, 2, 3, 4]) {
      const need = [15, 20, 25, 25][lv - 1];
      expect(GRAMMAR[lv].length).toBeGreaterThanOrEqual(need);
      for (const g of GRAMMAR[lv]) {
        expect(g.q).toContain('___');
        expect(new Set(g.options).size).toBe(g.options.length);
      }
      expect(READING[lv].reduce((n, t) => n + t.qs.length, 0)).toBeGreaterThanOrEqual(need);
      for (const t of READING[lv]) for (const q of t.qs) expect(new Set(q.options).size).toBe(q.options.length);
    }
    store.recordMock('en1', 250, 400, true);
    store.recordMock('en1', 300, 400, true);
    expect(store.getProgress().mock?.en1).toMatchObject({ best: 300, max: 400, attempts: 2 });
  });
  it('English has four levels with the v4.6 sizes', () => {
    data.setCourse('en');
    const levels = [...new Set(data.UNITS.map((u) => u.level))];
    expect(levels).toEqual([1, 2, 3, 4]);
    const size = (lv: number) => {
      const ls = data.CORE_LESSONS.filter((l) => data.unitLevel(l.unit) === lv);
      return [ls.length, ls.reduce((n, l) => n + l.words.length, 0)];
    };
    expect([1, 2, 3, 4, 5].map(size)).toEqual([
      [79, 959],
      [86, 1032],
      [89, 1068],
      [89, 1068],
      [64, 768],
    ]);
    expect([1, 2, 3, 4, 5].map((lv) => data.levelLabel(lv))).toEqual(['Sơ cấp', 'Trung cấp', 'Nâng cao', 'Thành thạo', 'Chuyên sâu']);
    data.setCourse('zh');
    expect(data.levelLabel(4)).toBe('HSK 4');
  });
});

describe('v4: Thi thử HSK', () => {
  it('papers follow the exam structure and score per section', async () => {
    const mock = await import('./mock');
    const sizes = mock.mockSpecs().map((s) => [s.level, mock.questionCount(s), s.minutes, mock.maxScore(s), s.pass]);
    expect(sizes).toEqual([
      [1, 40, 40, 200, 120],
      [2, 60, 55, 200, 120],
      [3, 80, 90, 300, 180],
      [4, 100, 105, 300, 180],
      [5, 100, 125, 300, 180],
      [6, 101, 140, 300, 180],
      [7, 101, 150, 300, 180],
      [8, 100, 140, 300, 180],
      [9, 100, 140, 300, 180],
    ]);
    for (const spec of mock.mockSpecs()) {
      const qs = mock.buildMock(spec);
      expect(qs.length).toBe(mock.questionCount(spec));
      for (const q of qs) {
        expect(q.explain.length, `${spec.level}#${q.n}`).toBeGreaterThan(10);
        if (q.kind === 'choice') {
          expect(q.answer, `${spec.level}#${q.n}`).toBeGreaterThanOrEqual(0);
          expect(new Set(q.options).size, `${spec.level}#${q.n} ${q.options}`).toBe(q.options.length);
          expect(q.options[q.answer]).toBe(q.solution);
        }
      }
      const right = qs.map((q) => (q.kind === 'choice' ? q.answer : (q.solution.match(/[^，。？！、]+/g) ?? [])));
      const all = mock.scoreMock(spec, qs, right as never);
      expect(all.score).toBe(mock.maxScore(spec));
      expect(all.passed).toBe(true);
      const none = mock.scoreMock(spec, qs, qs.map(() => undefined));
      expect(none.score).toBe(0);
      expect(none.passed).toBe(false);
    }
  });
  it('best score per level is kept, merged and survives course switches', () => {
    store.resetProgress();
    data.setCourse('zh');
    store.recordMock(1, 150, 200, true);
    store.recordMock(1, 90, 200, false);
    expect(store.getProgress().mock?.['1']).toMatchObject({ best: 150, passed: true, attempts: 2, last: 90 });
    data.setCourse('en');
    store.recordMock(2, 100, 200, false);
    data.setCourse('zh');
    expect(Object.keys(store.getStored().mock ?? {})).toEqual(['1', '2']);
    const other = store.defaultProgress();
    other.mock = { '1': { best: 180, max: 200, passed: true, attempts: 1, last: 180, date: '2026-01-01' } };
    const m = merge.mergeProgress(store.getStored(), other);
    expect(m.mock?.['1']).toMatchObject({ best: 180, attempts: 2 });
    expect(m.mock?.['2'].best).toBe(100);
    expect(store.sanitize(JSON.parse(JSON.stringify(m))).mock?.['1'].best).toBe(180);
  });
  it('chat text is cleaned and capped', async () => {
    const s = await import('./socialState');
    expect(s.cleanMessage('  xin chào 🐼\u0007 ')).toBe('xin chào 🐼');
    expect(s.cleanMessage('   ')).toBe('');
    expect(s.cleanMessage('x'.repeat(2000)).length).toBe(s.MAX_MESSAGE);
    expect(s.pairId('b', 'a')).toBe('a_b');
  });
});
