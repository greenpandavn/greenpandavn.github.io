import { describe, expect, it } from "vitest";
import en1 from "../data/en/u1.json";
import zh1 from "../data/zh/u1.json";
import type { CourseId, Word } from "../types";
import { GAME_QUESTIONS, buildRound, emojiOf } from "./game";
import { ART, CONCEPTS, alike, conceptOf } from "./gameArt";
import { EMOJI } from "./gameEmoji";
import zh2 from "../data/zh/u2.json";
import zh3 from "../data/zh/u3.json";
import en2 from "../data/en/u2.json";

const words = (d: unknown) =>
  (
    d as { lessons: { id: string; words: Omit<Word, "lessonId">[] }[] }
  ).lessons.flatMap((l) => l.words.map((w) => ({ ...w, lessonId: l.id })));
const lower = (s: string) => s.trim().toLowerCase();
const clueOf = (w: Word, kind: string) =>
  kind === "art"
    ? conceptOf(w.hanzi)
    : kind === "emoji"
      ? emojiOf(w)
      : kind === "pinyin"
        ? w.pinyin
        : w.vi;

describe("'Đúng hay Sai' rounds", () => {
  for (const [course, all] of [
    ["zh", [...words(zh1), ...words(zh2), ...words(zh3)]],
    ["en", [...words(en1), ...words(en2)]],
  ] as [CourseId, Word[]][]) {
    it(`${course}: 10 different words, about half wrong, wrong pairings are never correct`, () => {
      let wrong = 0;
      let pictures = 0;
      for (let n = 0; n < 300; n++) {
        const qs = buildRound(course, all.slice(0, 60), all);
        expect(qs).toHaveLength(GAME_QUESTIONS);
        expect(new Set(qs.map((q) => lower(q.word.hanzi))).size).toBe(
          GAME_QUESTIONS,
        );
        for (const q of qs) {
          const own = clueOf(q.word, q.kind);
          expect(q.truth).toBe(own);
          expect(lower(q.shown) === lower(q.truth)).toBe(q.match);
          if (!q.match) {
            wrong++;
            // the shown clue belongs to no word with the same spelling as the asked word
            const owners = all.filter(
              (w) => lower(clueOf(w, q.kind) ?? "") === lower(q.shown),
            );
            expect(owners.length).toBeGreaterThan(0);
            expect(
              owners.some(
                (w) =>
                  lower(w.hanzi) === lower(q.word.hanzi) ||
                  lower(w.vi) === lower(q.word.vi),
              ),
            ).toBe(false);
          }
          const concept = conceptOf(q.word.hanzi);
          if (q.kind === "art") {
            expect(ART[q.shown]).toBeTruthy();
            if (!q.match) expect(alike(q.shown, concept!)).toBe(false);
            pictures++;
          }
          if (course === "en")
            expect(q.kind).toBe(
              concept ? "art" : emojiOf(q.word) ? "emoji" : "vi",
            );
          else expect(q.kind).not.toBe("emoji");
        }
        expect(qs.filter((q) => q.match)).toHaveLength(5);
      }
      expect(wrong).toBe(1500);
      expect(pictures).toBeGreaterThan(900);
    });
  }

  it("prefers the finished words and tops up from the level", () => {
    const all = words(zh1);
    const done = all.slice(0, 12);
    const ids = new Set(done.map((w) => w.id));
    expect(buildRound("zh", done, all).every((q) => ids.has(q.word.id))).toBe(
      true,
    );
    const few = buildRound("zh", all.slice(0, 3), all);
    expect(few).toHaveLength(10);
    expect(
      few.filter((q) => all.slice(0, 3).some((w) => w.id === q.word.id)),
    ).toHaveLength(3);
  });

  it("has a drawing for every concept and no symbol-only emoji", () => {
    expect(CONCEPTS.length).toBeGreaterThanOrEqual(60);
    for (const c of CONCEPTS) expect(ART[c]?.length ?? 0).toBeGreaterThan(40);
    expect(Object.keys(ART).sort()).toEqual([...CONCEPTS].sort());
    // plain discs, keycap digits, arrows and other signs are not pictures
    const symbols = [
      0x1f534, 0x1f535, 0x26aa, 0x26ab, 0x20e3, 0x1f51f, 0x1f4af, 0x2b05,
      0x2b06, 0x2b07, 0x27a1, 0x2705, 0x274c, 0x2753, 0x26a0, 0x267b, 0x262e,
      0x269b, 0x1f6d1,
    ];
    const symbolic = (e: string) =>
      [...e].some(
        (ch) =>
          symbols.includes(ch.codePointAt(0)!) ||
          (ch.codePointAt(0)! >= 0x1f7e0 && ch.codePointAt(0)! <= 0x1f7eb),
      );
    for (const [word, emoji] of Object.entries(EMOJI)) {
      expect(symbolic(emoji), word).toBe(false);
      expect(conceptOf(word), word).toBeUndefined();
    }
    for (const colour of [
      "red",
      "blue",
      "green",
      "yellow",
      "purple",
      "black",
      "white",
      "brown",
    ]) {
      expect(conceptOf(colour)).toBe(colour);
      expect(ART[colour]).not.toMatch(/^<circle/);
    }
  });
});
