import type { ToeicTest } from "../../lib/toeic";

/**
 * "Thi thử TOEIC" papers. Each paper is its own lazily loaded chunk.
 * To add a paper: create ./toeicN (same shape as ./toeic1) and add one line here.
 */
export const TOEIC_TESTS: {
  id: string;
  title: string;
  load: () => Promise<ToeicTest>;
}[] = [
  {
    id: "toeic1",
    title: "TOEIC 1",
    load: () => import("./toeic1").then((m) => m.default),
  },
];
export const toeicTitle = (id: string) =>
  TOEIC_TESTS.find((t) => t.id === id)?.title;
