import { describe, expect, it } from 'vitest';
import en1 from '../data/en/u1.json';
import zh1 from '../data/zh/u1.json';
import type { Word } from '../types';
import { GAME_QUESTIONS, buildRound, emojiOf } from './game';

const words = (d: unknown) =>
  (d as { lessons: { id: string; words: Omit<Word, 'lessonId'>[] }[] }).lessons.flatMap((l) => l.words.map((w) => ({ ...w, lessonId: l.id })));
const lower = (s: string) => s.trim().toLowerCase();

describe("'Đúng hay Sai' rounds", () => {
  for (const [course, all] of [
    ['zh', words(zh1)],
    ['en', words(en1)],
  ] as const) {
    it(`${course}: 10 different words, about half wrong, wrong pairings are never correct`, () => {
      let wrong = 0;
      for (let n = 0; n < 300; n++) {
        const qs = buildRound(course, all.slice(0, 24), all);
        expect(qs).toHaveLength(GAME_QUESTIONS);
        expect(new Set(qs.map((q) => lower(q.word.hanzi))).size).toBe(GAME_QUESTIONS);
        for (const q of qs) {
          const own = q.kind === 'emoji' ? emojiOf(q.word) : q.kind === 'pinyin' ? q.word.pinyin : q.word.vi;
          expect(q.truth).toBe(own);
          expect(lower(q.shown) === lower(q.truth)).toBe(q.match);
          if (!q.match) {
            wrong++;
            // the shown clue belongs to no word with the same spelling as the asked word
            const owners = all.filter((w) => lower((q.kind === 'emoji' ? emojiOf(w) : q.kind === 'pinyin' ? w.pinyin : w.vi) ?? '') === lower(q.shown));
            expect(owners.length).toBeGreaterThan(0);
            expect(owners.some((w) => lower(w.hanzi) === lower(q.word.hanzi) || lower(w.vi) === lower(q.word.vi))).toBe(false);
          }
          if (course === 'en') expect(q.kind).toBe(emojiOf(q.word) ? 'emoji' : 'vi');
          else expect(q.kind).not.toBe('emoji');
        }
        expect(qs.filter((q) => q.match)).toHaveLength(5);
      }
      expect(wrong).toBe(1500);
    });
  }

  it('prefers the finished words and tops up from the level', () => {
    const all = words(zh1);
    const done = all.slice(0, 12);
    const ids = new Set(done.map((w) => w.id));
    expect(buildRound('zh', done, all).every((q) => ids.has(q.word.id))).toBe(true);
    const few = buildRound('zh', all.slice(0, 3), all);
    expect(few).toHaveLength(10);
    expect(few.filter((q) => all.slice(0, 3).some((w) => w.id === q.word.id))).toHaveLength(3);
  });
});
