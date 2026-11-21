import type { Word } from '../types';
import { BUNDLED_LESSONS, BUNDLED_UNITS, isPunct, sentencePinyin, sentenceZh } from '../data';
import { shuffle } from './exercises';

/**
 * "Thi thử HSK": full-length, timed mock exams generated from the course vocabulary.
 * The structure (number of questions per section, time, 100 points per section, pass mark)
 * follows the real HSK 2.0 papers; pictures are replaced by Vietnamese meanings.
 */
export type MockSection = 'listening' | 'reading' | 'writing';
export const SECTION_LABEL: Record<MockSection, string> = { listening: 'Nghe', reading: 'Đọc', writing: 'Viết' };

export interface MockQuestion {
  n: number; // 1-based number in the paper
  section: MockSection;
  part: string; // instruction shown above the question
  kind: 'choice' | 'arrange';
  audio?: string; // Chinese text read aloud (listening questions)
  prompt?: string; // Chinese text shown
  sub?: string; // pinyin / Vietnamese shown under the prompt
  options: string[]; // choices, or the shuffled tiles of an arrange question
  han?: boolean; // options are Chinese text
  answer: number; // index of the right choice (choice questions)
  accepted?: string[]; // accepted sentences without punctuation (arrange questions)
  solution: string; // the right answer as text, for the review
  explain: string;
}

export interface MockSpec {
  level: number;
  minutes: number;
  pass: number;
  sections: { id: MockSection; parts: { type: PartType; count: number }[] }[];
}

type PartType =
  | 'l-word-tf' // hear a word, is the shown meaning right?
  | 'l-word-meaning' // hear a word, pick its meaning
  | 'l-word-hanzi' // hear a word, pick the characters
  | 'l-sent-meaning' // hear a sentence, pick its meaning
  | 'l-sent-tf' // hear a sentence, is the statement right?
  | 'r-word-tf' // read a word, is the shown meaning right?
  | 'r-pinyin' // pick the pinyin of a word
  | 'r-cloze' // fill the gap in a sentence
  | 'r-sent-meaning' // read a sentence, pick its meaning
  | 'r-meaning-word' // pick the word for a meaning
  | 'w-arrange' // put the words in order
  | 'w-hanzi'; // pick the characters for the pinyin in a sentence

export const MOCK_SPECS: MockSpec[] = [
  {
    level: 1,
    minutes: 40,
    pass: 120,
    sections: [
      { id: 'listening', parts: [{ type: 'l-word-tf', count: 5 }, { type: 'l-word-meaning', count: 5 }, { type: 'l-word-hanzi', count: 5 }, { type: 'l-sent-meaning', count: 5 }] },
      { id: 'reading', parts: [{ type: 'r-word-tf', count: 5 }, { type: 'r-pinyin', count: 5 }, { type: 'r-sent-meaning', count: 5 }, { type: 'r-cloze', count: 5 }] },
    ],
  },
  {
    level: 2,
    minutes: 55,
    pass: 120,
    sections: [
      { id: 'listening', parts: [{ type: 'l-word-tf', count: 10 }, { type: 'l-word-meaning', count: 10 }, { type: 'l-sent-meaning', count: 10 }, { type: 'l-word-hanzi', count: 5 }] },
      { id: 'reading', parts: [{ type: 'r-word-tf', count: 5 }, { type: 'r-cloze', count: 5 }, { type: 'r-sent-meaning', count: 10 }, { type: 'r-pinyin', count: 5 }] },
    ],
  },
  {
    level: 3,
    minutes: 90,
    pass: 180,
    sections: [
      { id: 'listening', parts: [{ type: 'l-word-tf', count: 10 }, { type: 'l-word-hanzi', count: 10 }, { type: 'l-sent-tf', count: 10 }, { type: 'l-sent-meaning', count: 10 }] },
      { id: 'reading', parts: [{ type: 'r-cloze', count: 10 }, { type: 'r-sent-meaning', count: 10 }, { type: 'r-meaning-word', count: 10 }] },
      { id: 'writing', parts: [{ type: 'w-arrange', count: 5 }, { type: 'w-hanzi', count: 5 }] },
    ],
  },
];

const PART_TITLE: Record<PartType, string> = {
  'l-word-tf': 'Nghe từ và cho biết nghĩa bên dưới đúng hay sai',
  'l-word-meaning': 'Nghe từ và chọn nghĩa đúng',
  'l-word-hanzi': 'Nghe và chọn từ bạn nghe được',
  'l-sent-meaning': 'Nghe câu và chọn nghĩa đúng',
  'l-sent-tf': 'Nghe câu và cho biết nhận định bên dưới đúng hay sai',
  'r-word-tf': 'Đọc từ và cho biết nghĩa bên dưới đúng hay sai',
  'r-pinyin': 'Chọn phiên âm (pinyin) đúng',
  'r-cloze': 'Chọn từ thích hợp điền vào chỗ trống',
  'r-sent-meaning': 'Đọc câu và chọn nghĩa đúng',
  'r-meaning-word': 'Chọn từ tiếng Trung đúng với nghĩa',
  'w-arrange': 'Sắp xếp các từ thành câu hoàn chỉnh',
  'w-hanzi': 'Chọn chữ Hán đúng cho phần phiên âm trong ngoặc',
};

const levelOfUnit = new Map(BUNDLED_UNITS.map((u) => [u.unit, u.level ?? 1]));
/** Bundled Chinese words of one HSK level (independent of the course being studied). */
export function levelWords(level: number): Word[] {
  return BUNDLED_LESSONS.filter((l) => (levelOfUnit.get(l.unit) ?? 1) === level).flatMap((l) => l.words.map((w) => ({ ...w, lessonId: l.id })));
}
/** Levels that have a mock test: every HSK level with bundled content. */
export const mockSpecs = () => MOCK_SPECS.filter((s) => levelWords(s.level).length >= 60);
export const questionCount = (s: MockSpec) => s.sections.reduce((n, sec) => n + sec.parts.reduce((m, p) => m + p.count, 0), 0);
export const maxScore = (s: MockSpec) => s.sections.length * 100;

const TF = ['Đúng', 'Sai'];
const explainWord = (w: Word) => `${w.hanzi} (${w.pinyin}) = ${w.vi}. Ví dụ: ${sentenceZh(w)} (${sentencePinyin(w)}) — ${w.ex.vi}`;
const explainSentence = (w: Word) => `${sentenceZh(w)} (${sentencePinyin(w)}) = ${w.ex.vi} Từ chính: ${w.hanzi} (${w.pinyin}) = ${w.vi}.`;

/** `n` other words whose `key` differs from the target's and from each other. */
function others(w: Word, pool: Word[], n: number, key: (x: Word) => string): Word[] {
  const used = new Set([key(w)]);
  const out: Word[] = [];
  for (const o of shuffle(pool)) {
    if (out.length >= n) break;
    if (o.id === w.id || o.hanzi === w.hanzi || used.has(key(o))) continue;
    used.add(key(o));
    out.push(o);
  }
  return out;
}

function choice(correct: string, wrong: string[]) {
  const options = shuffle([correct, ...wrong]);
  return { options, answer: options.indexOf(correct) };
}

/** Index of the token that is exactly the word (so it can be blanked out), or -1. */
const tokenIndex = (w: Word) => w.ex.tokens.indexOf(w.hanzi);
const withGap = (w: Word, fill: string) => w.ex.tokens.map((t, i) => (i === tokenIndex(w) ? fill : t)).join('');

function make(type: PartType, w: Word, pool: Word[]): Omit<MockQuestion, 'n' | 'section' | 'part'> {
  switch (type) {
    case 'l-word-tf':
    case 'r-word-tf': {
      const right = Math.random() < 0.5;
      const shown = right ? w.vi : others(w, pool, 1, (x) => x.vi)[0].vi;
      const listen = type === 'l-word-tf';
      return {
        kind: 'choice',
        audio: listen ? w.hanzi : undefined,
        prompt: listen ? undefined : w.hanzi,
        sub: `★ Nghĩa: “${shown}”`,
        options: TF,
        answer: right ? 0 : 1,
        solution: right ? 'Đúng' : 'Sai',
        explain: explainWord(w),
      };
    }
    case 'l-word-meaning':
      return { kind: 'choice', audio: w.hanzi, ...choice(w.vi, others(w, pool, 2, (x) => x.vi).map((x) => x.vi)), solution: w.vi, explain: explainWord(w) };
    case 'l-word-hanzi':
      return {
        kind: 'choice',
        audio: w.hanzi,
        han: true,
        ...choice(w.hanzi, others(w, pool, 2, (x) => x.pinyin).map((x) => x.hanzi)),
        solution: w.hanzi,
        explain: explainWord(w),
      };
    case 'l-sent-meaning':
    case 'r-sent-meaning': {
      const listen = type === 'l-sent-meaning';
      return {
        kind: 'choice',
        audio: listen ? sentenceZh(w) : undefined,
        prompt: listen ? undefined : sentenceZh(w),
        ...choice(w.ex.vi, others(w, pool, 2, (x) => x.ex.vi).map((x) => x.ex.vi)),
        solution: w.ex.vi,
        explain: explainSentence(w),
      };
    }
    case 'l-sent-tf': {
      const right = Math.random() < 0.5;
      const shown = right ? w.ex.vi : others(w, pool, 1, (x) => x.ex.vi)[0].ex.vi;
      return { kind: 'choice', audio: sentenceZh(w), sub: `★ ${shown}`, options: TF, answer: right ? 0 : 1, solution: right ? 'Đúng' : 'Sai', explain: explainSentence(w) };
    }
    case 'r-pinyin':
      return {
        kind: 'choice',
        prompt: w.hanzi,
        sub: `Nghĩa: “${w.vi}”`,
        ...choice(w.pinyin, others(w, pool, 2, (x) => x.pinyin).map((x) => x.pinyin)),
        solution: w.pinyin,
        explain: explainWord(w),
      };
    case 'r-cloze':
      return {
        kind: 'choice',
        prompt: withGap(w, '（　　）'),
        sub: `Nghĩa của câu: ${w.ex.vi}`,
        han: true,
        ...choice(w.hanzi, others(w, pool, 3, (x) => x.hanzi).map((x) => x.hanzi)),
        solution: w.hanzi,
        explain: explainSentence(w),
      };
    case 'r-meaning-word':
      return {
        kind: 'choice',
        prompt: `“${w.vi}”`,
        han: true,
        ...choice(w.hanzi, others(w, pool, 3, (x) => x.vi).map((x) => x.hanzi)),
        solution: w.hanzi,
        explain: explainWord(w),
      };
    case 'w-hanzi':
      return {
        kind: 'choice',
        prompt: withGap(w, `（${w.pinyin}）`),
        sub: `Nghĩa của câu: ${w.ex.vi}`,
        han: true,
        ...choice(w.hanzi, others(w, pool, 3, (x) => x.hanzi).map((x) => x.hanzi)),
        solution: w.hanzi,
        explain: explainSentence(w),
      };
    case 'w-arrange': {
      const tiles = w.ex.tokens.filter((t) => !isPunct(t));
      return {
        kind: 'arrange',
        sub: `Nghĩa của câu: ${w.ex.vi}`,
        options: shuffle(tiles),
        han: true,
        answer: -1,
        accepted: [tiles.join(''), ...w.ex.alts.map((a) => a.replace(/[，。？！、\s]/g, ''))],
        solution: sentenceZh(w),
        explain: explainSentence(w),
      };
    }
  }
}

const fits = (type: PartType, w: Word) => {
  if (type === 'r-cloze' || type === 'w-hanzi') return tokenIndex(w) >= 0 && w.ex.tokens.filter((t) => !isPunct(t)).length >= 3;
  if (type === 'w-arrange') {
    const n = w.ex.tokens.filter((t) => !isPunct(t)).length;
    return n >= 4 && n <= 8;
  }
  return true;
};

/** Build one paper. Every question tests a different word of the level; distractors come from the same level. */
export function buildMock(spec: MockSpec): MockQuestion[] {
  const pool = levelWords(spec.level);
  const queue = shuffle(pool);
  const out: MockQuestion[] = [];
  let n = 0;
  for (const sec of spec.sections)
    for (const part of sec.parts)
      for (let i = 0; i < part.count; i++) {
        let k = queue.findIndex((w) => fits(part.type, w));
        if (k < 0) {
          queue.push(...shuffle(pool)); // level smaller than the paper: reuse words
          k = queue.findIndex((w) => fits(part.type, w));
        }
        const [w] = queue.splice(k, 1);
        out.push({ n: ++n, section: sec.id, part: PART_TITLE[part.type], ...make(part.type, w, pool) });
      }
  return out;
}

export type MockAnswer = number | string[] | undefined;
export const isAnswered = (a: MockAnswer) => (Array.isArray(a) ? a.length > 0 : a !== undefined);
export const isCorrect = (q: MockQuestion, a: MockAnswer) =>
  q.kind === 'arrange' ? Array.isArray(a) && !!q.accepted?.includes(a.join('')) : typeof a === 'number' && a === q.answer;
export const answerText = (q: MockQuestion, a: MockAnswer) =>
  !isAnswered(a) ? '(bỏ trống)' : Array.isArray(a) ? a.join('') : (q.options[a as number] ?? '');

export interface MockScore {
  sections: { id: MockSection; correct: number; total: number; score: number }[];
  score: number;
  max: number;
  passed: boolean;
  correct: number;
  total: number;
}

/** Each section is worth 100 points, like the real exam. */
export function scoreMock(spec: MockSpec, qs: MockQuestion[], answers: MockAnswer[]): MockScore {
  const sections = spec.sections.map((s) => {
    const idx = qs.map((q, i) => (q.section === s.id ? i : -1)).filter((i) => i >= 0);
    const correct = idx.filter((i) => isCorrect(qs[i], answers[i])).length;
    return { id: s.id, correct, total: idx.length, score: idx.length ? Math.round((correct / idx.length) * 100) : 0 };
  });
  const score = sections.reduce((n, s) => n + s.score, 0);
  return {
    sections,
    score,
    max: maxScore(spec),
    passed: score >= spec.pass,
    correct: sections.reduce((n, s) => n + s.correct, 0),
    total: qs.length,
  };
}
