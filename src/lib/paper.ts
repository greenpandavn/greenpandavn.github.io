import type { MockQuestion, MockSection, MockSpec } from "./mock";
import { shuffle } from "./exercises";

/**
 * Hand-written English papers (CEFR exams, placement test, part tests, listening practice).
 * They run in the same exam screen as the generated mock exams.
 *
 * Source format, one item per line:
 *   # vocab|grammar|reading|listening     starts a section
 *   @ text                                 reading text for the questions that follow
 *   ~ text                                 text read aloud (TTS) for the questions that follow
 *   question|right answer|wrong|wrong|wrong|explanation (Vietnamese)
 */
export type PaperGroup = "cefr" | "placement" | "part" | "listening";
export interface PaperMeta {
  id: string;
  group: PaperGroup;
  title: string;
  desc: string;
  /** English course part the paper belongs to (part tests and listening practice). */
  part?: string;
  minutes: number;
  /** Pass mark, out of 100 points per section. */
  pass: number;
  counts: [MockSection, number][];
  /** Placement test: lowest number of right answers for each estimated level. */
  bands?: [number, string][];
}

const PART: Record<string, string> = {
  vocab: "Chọn đáp án đúng",
  grammar: "Chọn đáp án đúng để hoàn thành câu",
  reading: "Đọc đoạn văn và trả lời câu hỏi",
  listening: "Nghe và chọn đáp án đúng",
};

export function parsePaper(src: string): MockQuestion[] {
  const out: MockQuestion[] = [];
  let section: MockSection = "vocab";
  let passage: string | undefined;
  let audio: string | undefined;
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line[0] === "#") {
      section = line.slice(1).trim() as MockSection;
      passage = audio = undefined;
    } else if (line[0] === "@") passage = line.slice(1).trim() || undefined;
    else if (line[0] === "~") audio = line.slice(1).trim() || undefined;
    else {
      const f = line.split("|").map((x) => x.trim());
      if (f.length < 5) throw new Error(`paper: bad line "${line}"`);
      const explain = f[f.length - 1];
      const right = f[1];
      const options = shuffle(f.slice(1, -1));
      out.push({
        n: out.length + 1,
        section,
        part: PART[section],
        kind: "choice",
        audio,
        passage,
        prompt: f[0],
        options,
        answer: options.indexOf(right),
        solution: right,
        explain,
      });
    }
  }
  return out;
}

export const paperSpec = (m: PaperMeta, src: string): MockSpec => ({
  id: m.id,
  course: "en",
  title: m.title,
  level: 0,
  minutes: m.minutes,
  pass: m.pass,
  sections: m.counts.map(([id, count]) => ({
    id,
    parts: [{ type: "g-choice", count }],
  })),
  paper: src,
  bands: m.bands,
});

/** Estimated level of a placement test from the number of right answers. */
export const bandOf = (bands: [number, string][], correct: number) =>
  [...bands].sort((a, b) => b[0] - a[0]).find((b) => correct >= b[0])?.[1] ??
  bands[0][1];
