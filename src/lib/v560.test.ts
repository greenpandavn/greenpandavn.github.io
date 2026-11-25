import { describe, expect, it } from "vitest";
import * as data from "../data";
import { buildMock, mockSpecs, questionCount, scoreMock } from "./mock";
import { buildRound } from "./game";
import { speechLang } from "./speech";
import { needsLogin } from "./gate";
import { partVip, setVipParts } from "./vip";

describe("v5.6.0 Thai course", () => {
  it("5,000 words in five levels of 1,000, lessons of 12 or 13 words", async () => {
    expect(data.COURSES.find((x) => x.id === "th")?.label).toBe("Tiếng Thái");
    await data.loadCourse("th");
    data.setCourse("th");
    const lvs = [1, 2, 3, 4, 5];
    expect(data.LESSONS.length).toBe(415);
    expect(data.ALL_WORDS.length).toBe(5000);
    expect(data.courseWordCount("th")).toBe(5000);
    expect(new Set(data.ALL_WORDS.map((w) => w.hanzi)).size).toBe(5000);
    expect(lvs.map((lv) => data.levelWordCount(lv, "th"))).toEqual([1000, 1000, 1000, 1000, 1000]);
    expect(lvs.map((lv) => data.levelLabel(lv))).toEqual(["Sơ cấp", "Trung cấp", "Nâng cao", "Thành thạo", "Chuyên sâu"]);
    const sizes = data.LESSONS.map((l) => l.words.length);
    expect(sizes.filter((n) => n === 12).length).toBe(395);
    expect(sizes.filter((n) => n === 13).length).toBe(20);
    for (const w of data.ALL_WORDS) {
      expect(w.hanzi, w.id).toMatch(/^[\u0e00-\u0e7f]+$/);
      expect(w.pinyin, w.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(w.vi.trim().length, w.id).toBeGreaterThan(0);
      expect(data.sentenceZh(w).length, w.id).toBeGreaterThan(w.hanzi.length);
    }
    expect(speechLang(data.ALL_WORDS[0].hanzi)).toBe("th-TH");
    // login gate from part 3, VIP from part 5
    setVipParts(null);
    const units = data.UNITS.map((u) => u.unit);
    expect(units.filter((u) => !needsLogin(u))).toEqual([1, 2]);
    expect(units.filter((u) => !partVip("th", u))).toEqual([1, 2, 3, 4]);
    // one mock exam per level
    const specs = mockSpecs("th");
    expect(specs.map((s) => s.level)).toEqual(lvs);
    for (const spec of specs) {
      const qs = buildMock(spec);
      expect(qs.length).toBe(questionCount(spec));
      for (const q of qs) if (q.kind === "choice") expect(new Set(q.options).size, `${spec.id} q${q.n}`).toBe(q.options.length);
      const full = scoreMock(spec, qs, qs.map((q) => (q.kind === "arrange" ? [q.accepted![0]] : q.answer)));
      expect(full.correct, spec.id).toBe(qs.length);
      expect(full.passed).toBe(true);
    }
    // game: wrong pairings are really wrong
    for (const lv of lvs) {
      const level = data.ALL_WORDS.slice((lv - 1) * 1000, lv * 1000);
      for (let i = 0; i < 30; i++) {
        const round = buildRound("th", level.slice(0, 24), level);
        expect(round.length).toBe(10);
        for (const q of round) {
          const own = q.kind === "pinyin" ? q.word.pinyin : q.word.vi;
          expect(q.shown === own, `${q.word.hanzi} ${q.shown}`).toBe(q.match);
        }
      }
    }
    data.setCourse("zh");
  });
});
