import { shuffle } from "./exercises";

/**
 * "Thi thử TOEIC": full Listening & Reading papers (200 questions, 120 minutes).
 * A paper is plain data (see src/data/toeic); everything here works for any number of papers.
 * In every item the FIRST option is the right answer; the paper shuffles the options.
 */
export interface ToeicItem {
  /** Question text. Part 2: the question that is heard. Parts 5: the sentence with a gap (___). Part 6: omitted. */
  q?: string;
  options: string[];
  explain: string;
}
export interface ToeicGroup {
  /** Lines of the conversation / talk / text. Listening lines may start with a speaker label such as "M: ". */
  text: string[];
  qs: ToeicItem[];
}
export interface ToeicPhoto {
  /** The photograph, described in Vietnamese (shown instead of a picture). */
  scene: string;
  options: string[];
  explain: string;
}
export interface ToeicTest {
  id: string;
  title: string;
  part1: ToeicPhoto[];
  part2: ToeicItem[];
  part3: ToeicGroup[];
  part4: ToeicGroup[];
  part5: ToeicItem[];
  part6: ToeicGroup[];
  part7: ToeicGroup[];
}

export type ToeicSection = "listening" | "reading";
export const TOEIC_SECTIONS: {
  id: ToeicSection;
  label: string;
  minutes: number;
  parts: number[];
}[] = [
  { id: "listening", label: "Nghe", minutes: 45, parts: [1, 2, 3, 4] },
  { id: "reading", label: "Đọc", minutes: 75, parts: [5, 6, 7] },
];
export const TOEIC_MINUTES = TOEIC_SECTIONS.reduce((n, s) => n + s.minutes, 0);
/** Number of questions of each part in the official format. */
export const TOEIC_PARTS: Record<
  number,
  { count: number; name: string; title: string }
> = {
  1: {
    count: 6,
    name: "Mô tả tranh",
    title:
      "Part 1 – Đọc mô tả bức ảnh, nghe bốn câu và chọn câu mô tả đúng nhất",
  },
  2: {
    count: 25,
    name: "Hỏi – đáp",
    title: "Part 2 – Nghe câu hỏi và ba câu đáp, chọn câu đáp phù hợp nhất",
  },
  3: {
    count: 39,
    name: "Hội thoại",
    title: "Part 3 – Nghe đoạn hội thoại và trả lời câu hỏi",
  },
  4: {
    count: 30,
    name: "Bài nói",
    title: "Part 4 – Nghe bài nói và trả lời câu hỏi",
  },
  5: {
    count: 30,
    name: "Hoàn thành câu",
    title: "Part 5 – Chọn đáp án đúng để hoàn thành câu",
  },
  6: {
    count: 16,
    name: "Hoàn thành đoạn văn",
    title: "Part 6 – Chọn đáp án đúng cho từng chỗ trống trong văn bản",
  },
  7: {
    count: 54,
    name: "Đọc hiểu",
    title: "Part 7 – Đọc văn bản và trả lời câu hỏi",
  },
};
export const TOEIC_TOTAL = Object.values(TOEIC_PARTS).reduce(
  (n, p) => n + p.count,
  0,
);

export interface ToeicQuestion {
  n: number; // 1-based number in the paper
  section: ToeicSection;
  part: number;
  /** Questions that share one conversation / talk / text have the same group. */
  group: string;
  /** What is read aloud, one utterance per entry (listening questions). */
  audio?: string[];
  scene?: string;
  passage?: string[];
  prompt?: string;
  options: string[];
  /** Parts 1 and 2: the choices are only heard, the screen shows the letters. */
  heardOnly: boolean;
  answer: number;
  solution: string;
  explain: string;
}

const LETTER = "ABCD";
const unlabel = (line: string) => line.replace(/^[A-Z][A-Za-z0-9]*: /, "");
function mix(options: string[]) {
  const shuffled = shuffle(options);
  return {
    options: shuffled,
    answer: shuffled.indexOf(options[0]),
    solution: options[0],
  };
}

/** Build the 200 questions of a paper in the official order. */
export function buildToeic(t: ToeicTest): ToeicQuestion[] {
  const out: ToeicQuestion[] = [];
  let n = 0;
  const read = (o: string[]) => o.map((x, i) => `${LETTER[i]}. ${x}`);
  t.part1.forEach((p, i) => {
    const m = mix(p.options);
    out.push({
      n: ++n,
      section: "listening",
      part: 1,
      group: `1-${i}`,
      scene: p.scene,
      audio: read(m.options),
      heardOnly: true,
      ...m,
      explain: p.explain,
    });
  });
  t.part2.forEach((p, i) => {
    const m = mix(p.options);
    out.push({
      n: ++n,
      section: "listening",
      part: 2,
      group: `2-${i}`,
      audio: [p.q ?? "", ...read(m.options)],
      heardOnly: true,
      ...m,
      explain: p.explain,
    });
  });
  const groups = (part: number, section: ToeicSection, list: ToeicGroup[]) =>
    list.forEach((g, i) =>
      g.qs.forEach((q, k) => {
        const listening = section === "listening";
        out.push({
          n: ++n,
          section,
          part,
          group: `${part}-${i}`,
          audio: listening ? g.text.map(unlabel) : undefined,
          passage: listening ? undefined : g.text,
          prompt: q.q ?? `Chỗ trống [${k + 1}]`,
          heardOnly: false,
          ...mix(q.options),
          explain: q.explain,
        });
      }),
    );
  groups(3, "listening", t.part3);
  groups(4, "listening", t.part4);
  t.part5.forEach((p, i) =>
    out.push({
      n: ++n,
      section: "reading",
      part: 5,
      group: `5-${i}`,
      prompt: p.q,
      heardOnly: false,
      ...mix(p.options),
      explain: p.explain,
    }),
  );
  groups(6, "reading", t.part6);
  groups(7, "reading", t.part7);
  return out;
}
/** The text of a listening question (shown in the answer review). */
export const transcript = (t: ToeicTest, q: ToeicQuestion): string[] => {
  const i = Number(q.group.split("-")[1]);
  if (q.part === 3) return t.part3[i].text;
  if (q.part === 4) return t.part4[i].text;
  return q.audio ?? [];
};

/**
 * Number of right answers (0–100) → scaled score 5–495 in steps of 5.
 * The real conversion changes with every test form; this is the usual estimate
 * (listening is scored a little more generously than reading).
 */
export function toeicScaled(section: ToeicSection, correct: number): number {
  const raw = Math.max(0, Math.min(100, Math.round(correct)));
  const est = section === "listening" ? raw * 5.4 - 25 : raw * 5.2 - 25;
  return Math.max(5, Math.min(495, Math.round(est / 5) * 5));
}

export type ToeicAnswer = number | undefined;
export interface ToeicScore {
  sections: {
    id: ToeicSection;
    correct: number;
    total: number;
    score: number;
  }[];
  parts: { part: number; correct: number; total: number }[];
  score: number; // 10–990
  max: number;
  correct: number;
  total: number;
}
export const TOEIC_MAX = 990;
export function scoreToeic(
  qs: ToeicQuestion[],
  answers: ToeicAnswer[],
): ToeicScore {
  const right = (f: (q: ToeicQuestion) => boolean) =>
    qs.filter((q, i) => f(q) && answers[i] === q.answer).length;
  const sections = TOEIC_SECTIONS.map((s) => {
    const total = qs.filter((q) => q.section === s.id).length;
    const correct = right((q) => q.section === s.id);
    return {
      id: s.id,
      correct,
      total,
      score: toeicScaled(s.id, total ? (correct / total) * 100 : 0),
    };
  });
  return {
    sections,
    parts: Object.keys(TOEIC_PARTS).map((p) => ({
      part: Number(p),
      correct: right((q) => q.part === Number(p)),
      total: qs.filter((q) => q.part === Number(p)).length,
    })),
    score: sections.reduce((n, s) => n + s.score, 0),
    max: TOEIC_MAX,
    correct: sections.reduce((n, s) => n + s.correct, 0),
    total: qs.length,
  };
}
