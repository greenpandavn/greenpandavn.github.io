import { describe, expect, it } from "vitest";
import { buildMock, questionCount, scoreMock } from "./mock";
import { bandOf, paperSpec, parsePaper } from "./paper";
import { CEFR_PAPERS, LISTENING_COUNT, loadListening, loadPaper, PART_TESTS, PLACEMENT } from "../data/papers";
import { TOEIC_TESTS } from "../data/toeic";
import { buildToeic, TOEIC_PARTS } from "./toeic";
import meta from "../data/en/meta.json";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

describe("v5.2.9 English library", () => {
  it("English course has at least 5,000 different words", () => {
    const total = (meta as { lessons: unknown[][] }).lessons.reduce((n, l) => n + (l[4] as number), 0);
    expect(total).toBeGreaterThanOrEqual(5000);
  });

  it("TOEIC 1–3: 200 questions each in the official layout, no question shared between papers", async () => {
    expect(TOEIC_TESTS.map((t) => t.id)).toEqual(["toeic1", "toeic2", "toeic3"]);
    const seen = new Map<string, string>();
    for (const t of TOEIC_TESTS) {
      const paper = await t.load();
      const qs = buildToeic(paper);
      expect(qs.length).toBe(200);
      for (const [part, info] of Object.entries(TOEIC_PARTS))
        expect(qs.filter((q) => q.part === Number(part)).length, `${t.id} part ${part}`).toBe(info.count);
      expect(qs.filter((q) => q.section === "listening").length).toBe(100);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(new Set(q.options).size, `${t.id} q${q.n} options`).toBe(q.options.length);
      }
      const keys = [
        ...paper.part1.map((x) => x.scene),
        ...paper.part2.map((x) => x.q ?? ""),
        ...paper.part5.map((x) => x.q ?? ""),
        ...[...paper.part3, ...paper.part4, ...paper.part6, ...paper.part7].map((g) => g.text.join(" ")),
      ].map(norm);
      for (const k of keys) {
        expect(seen.get(k), `"${k.slice(0, 50)}" repeated in ${t.id}`).toBeUndefined();
        seen.set(k, t.id);
      }
    }
  });

  it("CEFR, placement, part tests and listening: counts match, right answer present, no repeated question", async () => {
    expect(CEFR_PAPERS.map((m) => m.title)).toEqual(["CEFR A1", "CEFR A2", "CEFR B1", "CEFR B2", "CEFR C1"]);
    const listening = await loadListening();
    expect(listening.length).toBe(LISTENING_COUNT);
    expect(listening.length).toBeGreaterThanOrEqual(20);
    const all = [
      ...(await Promise.all([...CEFR_PAPERS, PLACEMENT, ...PART_TESTS].map(async (m) => ({ meta: m, src: await loadPaper(m) })))),
      ...listening,
    ];
    const seen = new Set<string>();
    for (const { meta: m, src } of all) {
      const spec = paperSpec(m, src);
      const qs = buildMock(spec);
      expect(qs.length, m.id).toBe(questionCount(spec));
      for (const [section, count] of m.counts) expect(qs.filter((q) => q.section === section).length, `${m.id} ${section}`).toBe(count);
      if (m.group === "cefr") expect(qs.length).toBeGreaterThanOrEqual(40);
      if (m.group === "part") expect(qs.length).toBe(20);
      if (m.group === "listening") expect(qs.every((q) => q.audio && q.audio.length > 40)).toBe(true);
      for (const q of qs) {
        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size, `${m.id} q${q.n}`).toBe(4);
        expect(q.options[q.answer]).toBe(q.solution);
        expect(q.explain.length).toBeGreaterThan(5);
        const key = norm(`${q.audio ?? ""} ${q.passage ?? ""} ${q.prompt}`) + (m.group === "listening" ? "" : "");
        expect(seen.has(key), `${m.id}: "${q.prompt}" repeated`).toBe(false);
        seen.add(key);
      }
      // every right answer gives full marks, an empty paper gives none
      const full = scoreMock(spec, qs, qs.map((q) => q.answer));
      expect(full.score).toBe(full.max);
      expect(full.passed).toBe(true);
      expect(scoreMock(spec, qs, qs.map(() => undefined)).score).toBe(0);
    }
    expect(PLACEMENT.counts.reduce((n, c) => n + c[1], 0)).toBe(42);
  });

  it("placement bands", () => {
    const b = PLACEMENT.bands!;
    expect([0, 11, 12, 19, 20, 28, 29, 36, 37, 42].map((n) => bandOf(b, n))).toEqual(["A1", "A1", "A2", "A2", "B1", "B1", "B2", "B2", "C1", "C1"]);
  });

  it("parsePaper rejects a broken line", () => {
    expect(() => parsePaper("# vocab\nq|a|b")).toThrow();
  });
});
