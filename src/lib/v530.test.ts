import { describe, expect, it } from "vitest";
import * as data from "../data";
import { buildMock, mockSpecs, questionCount, scoreMock } from "./mock";
import { buildRound } from "./game";
import { speechLang } from "./speech";
import { needsLogin } from "./gate";
import { courseView, defaultProgress, sanitize, xpByCourse } from "./store";
import { mergeProgress } from "./merge";

describe("v5.3.0 Korean and Japanese courses", () => {
  for (const [c, label, levels] of [
    ["ko", "Tiếng Hàn", ["TOPIK 1", "TOPIK 2"]],
    ["ja", "Tiếng Nhật", ["JLPT N5", "JLPT N4"]],
  ] as const)
    it(`${label}: 30 lessons, 360 words with romanization, example and meaning`, async () => {
      expect(data.COURSES.find((x) => x.id === c)?.label).toBe(label);
      await data.loadCourse(c);
      data.setCourse(c);
      expect(data.LESSONS.length).toBe(30);
      expect(data.ALL_WORDS.length).toBe(360);
      expect(new Set(data.ALL_WORDS.map((w) => w.hanzi)).size).toBe(360);
      expect([1, 2].map((lv) => data.levelLabel(lv))).toEqual(levels);
      expect([1, 2].map((lv) => data.levelWordCount(lv, c))).toEqual([180, 180]);
      const script = c === "ko" ? /[\uac00-\ud7a3]/ : /[\u3040-\u30ff\u4e00-\u9fff]/;
      for (const w of data.ALL_WORDS) {
        expect(w.hanzi, w.id).toMatch(script);
        expect(w.pinyin, w.id).toMatch(/^[a-z' ]+$/);
        expect(w.vi.length).toBeGreaterThan(0);
        expect(w.ex.tokens.length).toBe(w.ex.py.length);
        expect(w.ex.vi.length).toBeGreaterThan(3);
        // every token of the example has a Latin transcription
        expect(w.ex.py.every((p) => /^[a-z0-9',.?!]+$/i.test(p)), `${w.id}: ${w.ex.py.join(" ")}`).toBe(true);
        expect(speechLang(data.sentenceZh(w))).toBe(c === "ko" ? "ko-KR" : "ja-JP");
        expect(speechLang(w.hanzi)).toBe(c === "ko" ? "ko-KR" : "ja-JP");
      }
      // parts 1–2 are free, part 3 and the second level need an account
      const units = data.UNITS.map((u) => u.unit);
      expect(units).toEqual([1, 2, 3, 21, 22, 23]);
      expect(units.filter((u) => !needsLogin(u))).toEqual([1, 2]);
      // mock exams
      const specs = mockSpecs(c);
      expect(specs.map((s) => s.title)).toEqual(levels);
      for (const spec of specs) {
        const qs = buildMock(spec);
        expect(qs.length).toBe(questionCount(spec));
        for (const q of qs) if (q.kind === "choice") expect(new Set(q.options).size, `${spec.id} q${q.n}`).toBe(q.options.length);
        const full = scoreMock(spec, qs, qs.map((q) => (q.kind === "arrange" ? [q.accepted![0]] : q.answer)));
        expect(full.correct, spec.id).toBe(qs.length);
        expect(full.passed).toBe(true);
      }
      // game: wrong pairings are really wrong, no repeated word
      const level = data.ALL_WORDS.slice(0, 180);
      for (let i = 0; i < 100; i++) {
        const round = buildRound(c, level.slice(0, 24), level);
        expect(round.length).toBe(10);
        expect(new Set(round.map((q) => q.word.id)).size).toBe(10);
        for (const q of round) {
          expect(["pinyin", "vi"]).toContain(q.kind);
          const own = q.kind === "pinyin" ? q.word.pinyin : q.word.vi;
          expect(q.shown === own, `${q.word.hanzi} ${q.shown}`).toBe(q.match);
        }
      }
      data.setCourse("zh");
    });

  it("Korean sentences keep their spaces, Japanese ones have none; arranged answers compare by letters", async () => {
    await data.loadUnits([1], "ko");
    await data.loadUnits([1], "ja");
    data.setCourse("ko");
    const ko = data.ALL_WORDS.find((w) => w.hanzi === "학생")!;
    expect(data.sentenceZh(ko)).toBe("제 동생은 대학교 학생입니다.");
    expect(data.sentencePinyin(ko)).toBe("Je dongsaengeun daehakgyo haksaengimnida.");
    expect(data.sentenceKey("제 동생은 대학교 학생입니다.")).toBe("제동생은대학교학생입니다");
    data.setCourse("ja");
    const ja = data.ALL_WORDS.find((w) => w.hanzi === "学生")!;
    expect(ja.pinyin).toBe("gakusei");
    expect(data.sentenceZh(ja)).toBe("弟は大学の学生です。");
    expect(data.sentencePinyin(ja)).toBe("Otouto wa daigaku no gakusei desu.");
    expect(speechLang("学生")).toBe("ja-JP");
    data.setCourse("zh");
    expect(speechLang("学生")).toBe("zh-CN");
  });

  it("progress of the four courses is kept apart and their XP adds up", () => {
    const p = sanitize({ ...defaultProgress(), xp: 100, en: { xp: 20, lessons: {} }, ko: { xp: 30, lessons: { ko101: { completed: 1, bestAccuracy: 1 } } }, ja: { xp: 5, lessons: {} } });
    expect(xpByCourse(p)).toEqual({ zh: 100, en: 20, ko: 30, ja: 5, total: 155 });
    expect(courseView(p, "ko").xp).toBe(30);
    expect(Object.keys(courseView(p, "ko").lessons)).toEqual(["ko101"]);
    expect(courseView(p, "ja").xp).toBe(5);
    const other = sanitize({ ...defaultProgress(), xp: 10, ko: { xp: 50, lessons: {} } });
    const m = mergeProgress(p, other);
    expect(m.ko?.xp).toBe(50);
    expect(Object.keys(m.ko?.lessons ?? {})).toEqual(["ko101"]);
    expect(m.ja?.xp).toBe(5);
  });
});
