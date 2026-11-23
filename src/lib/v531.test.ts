import { describe, expect, it } from "vitest";
import meta from "../data/en/meta.json";

describe("v5.3.1 English course clean-up", () => {
  const units = (meta as { units: { unit: number; level: number; title: string }[] }).units;
  const lessons = (meta as unknown as { lessons: [string, string, string, number, number][] }).lessons;
  it("parts are numbered 1…73 through the course", () => {
    expect(units.map((u) => Number(/^Phần (\d+):/.exec(u.title)?.[1]))).toEqual(units.map((_, i) => i + 1));
    expect(units.length).toBe(73);
  });
  it("no two lessons share a title, and the totals are the v5.4.1 ones", () => {
    expect(new Set(lessons.map((l) => l[1])).size).toBe(lessons.length);
    expect(lessons.length).toBe(792);
    expect(lessons.reduce((n, l) => n + l[4], 0)).toBe(10000);
  });
});
