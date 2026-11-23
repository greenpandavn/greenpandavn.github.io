import type { Word } from '../types';
import { ALL_WORDS, isEnglish, isRoman, sentenceTiles } from '../data';
import { toneless } from './pinyin';
import type { Difficulty } from './gamification';

export type Tile = { id: string; zh: string; py: string };

export type Exercise =
  | { id: string; kind: 'intro'; word: Word }
  | { id: string; kind: 'listen'; word: Word; options: Word[] }
  | { id: string; kind: 'meaning'; word: Word; sentence: boolean; options: string[] }
  | { id: string; kind: 'char'; word: Word; options: Word[] }
  | { id: string; kind: 'type'; word: Word; mode: 'audio' | 'char' }
  | { id: string; kind: 'match'; words: Word[] }
  | { id: string; kind: 'arrange'; word: Word; tiles: Tile[] }
  | { id: string; kind: 'speak'; word: Word };

export type ExerciseKind = Exercise['kind'];

/** What a word sounds like, for telling apart listening options (pinyin, or the word itself in English). */
const soundKey = (w: Word) => (w.pinyin ? toneless(w.pinyin) : w.hanzi.toLowerCase());

export const KIND_LABEL_EN: Partial<Record<ExerciseKind, string>> = { char: 'Chọn từ đúng', type: 'Chính tả' };
const KIND_LABEL_ROMAN: Partial<Record<ExerciseKind, string>> = { char: 'Chọn từ đúng', type: 'Gõ phiên âm' };
export const kindLabel = (k: ExerciseKind) => (isEnglish() && KIND_LABEL_EN[k]) || (isRoman() && KIND_LABEL_ROMAN[k]) || KIND_LABEL[k];

export const KIND_LABEL: Record<ExerciseKind, string> = {
  intro: 'Từ mới',
  listen: 'Nghe và chọn',
  meaning: 'Chọn nghĩa',
  char: 'Chọn chữ Hán',
  type: 'Gõ pinyin',
  match: 'Ghép cặp',
  arrange: 'Sắp xếp câu',
  speak: 'Luyện nói',
};

let seq = 0;
const uid = () => `ex${++seq}`;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const exerciseWords = (ex: Exercise): Word[] => (ex.kind === 'match' ? ex.words : [ex.word]);

/** Pick distractor words: same lesson first, then the rest of the course. Avoids look/sound-alikes. */
function distractors(word: Word, pool: Word[], n: number, avoidSound: boolean): Word[] {
  const ok = (w: Word) =>
    w.id !== word.id &&
    w.hanzi !== word.hanzi &&
    w.vi !== word.vi &&
    (!avoidSound || soundKey(w) !== soundKey(word));
  const picked: Word[] = [];
  const used = new Set<string>();
  for (const src of [shuffle(pool), shuffle(ALL_WORDS)]) {
    for (const w of src) {
      if (picked.length >= n) break;
      if (!ok(w) || used.has(w.hanzi) || used.has(soundKey(w)) || used.has(w.vi)) continue;
      used.add(w.hanzi);
      used.add(soundKey(w));
      used.add(w.vi);
      picked.push(w);
    }
  }
  return picked;
}

const optionCount = (d: Difficulty) => (d === 'easy' ? 3 : 4);

export function makeExercise(kind: ExerciseKind, word: Word, pool: Word[], d: Difficulty): Exercise {
  switch (kind) {
    case 'listen':
      return { id: uid(), kind, word, options: shuffle([word, ...distractors(word, pool, optionCount(d) - 1, true)]) };
    case 'char':
      return { id: uid(), kind, word, options: shuffle([word, ...distractors(word, pool, optionCount(d) - 1, false)]) };
    case 'meaning':
      return {
        id: uid(),
        kind,
        word,
        sentence: false,
        options: shuffle([word.vi, ...distractors(word, pool, optionCount(d) - 1, false).map((w) => w.vi)]),
      };
    case 'type':
      return { id: uid(), kind, word, mode: Math.random() < 0.5 ? 'audio' : 'char' };
    case 'arrange':
      return makeArrange(word, pool, d);
    case 'speak':
      return { id: uid(), kind, word };
    case 'intro':
      return { id: uid(), kind, word };
    case 'match':
      return { id: uid(), kind, words: [word, ...distractors(word, pool, 4, false)] };
  }
}

export function makeSentenceMeaning(word: Word, pool: Word[], d: Difficulty): Exercise {
  const others = shuffle(pool.length > 3 ? pool : ALL_WORDS)
    .filter((w) => w.id !== word.id && w.ex.vi !== word.ex.vi)
    .slice(0, optionCount(d) - 1)
    .map((w) => w.ex.vi);
  return { id: uid(), kind: 'meaning', word, sentence: true, options: shuffle([word.ex.vi, ...others]) };
}

export function makeArrange(word: Word, pool: Word[], d: Difficulty): Exercise {
  const tiles: Tile[] = sentenceTiles(word).map((t, i) => ({ id: `t${i}`, ...t }));
  const extra = d === 'easy' ? 0 : d === 'normal' ? 1 : 2;
  const have = new Set(tiles.map((t) => t.zh));
  const extras = shuffle(pool.length > 4 ? pool : ALL_WORDS)
    .filter((w) => !have.has(w.hanzi) && (w.pinyin ? w.hanzi.length <= 2 : !w.hanzi.includes(' ')))
    .slice(0, extra)
    .map((w, i) => ({ id: `x${i}`, zh: w.hanzi, py: w.pinyin }));
  return { id: uid(), kind: 'arrange', word, tiles: shuffle([...tiles, ...extras]) };
}

export function makeMatch(words: Word[]): Exercise {
  // unique hanzi & meanings so every pair is unambiguous
  const seen = new Set<string>();
  const list = words.filter((w) => {
    if (seen.has(w.hanzi) || seen.has(w.vi)) return false;
    seen.add(w.hanzi);
    seen.add(w.vi);
    return true;
  });
  return { id: uid(), kind: 'match', words: shuffle(list).slice(0, 5) };
}

const ROTATION: Record<Difficulty, ExerciseKind[]> = {
  easy: ['listen', 'meaning', 'listen', 'char', 'meaning', 'listen', 'type'],
  normal: ['listen', 'char', 'meaning', 'type', 'listen', 'meaning', 'char', 'type'],
  hard: ['type', 'char', 'listen', 'type', 'meaning', 'type', 'char'],
};

interface BuildOpts {
  difficulty: Difficulty;
  newWordIds: Set<string>;
  speaking: boolean;
}

/** Builds the exercise queue for a lesson. Every exercise type appears at least once. */
export function buildLesson(words: Word[], opts: BuildOpts): Exercise[] {
  const d = opts.difficulty;
  const out: Exercise[] = [];
  const rot = ROTATION[d];
  let r = Math.floor(Math.random() * 2);
  const chunks: Word[][] = [];
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4));
  const usedKinds = new Set<ExerciseKind>();

  chunks.forEach((chunk, ci) => {
    chunk.filter((w) => opts.newWordIds.has(w.id)).forEach((w) => out.push(makeExercise('intro', w, words, d)));
    for (const w of shuffle(chunk)) {
      // make sure the core types all show up early in short lessons
      let kind = rot[r++ % rot.length];
      const missing = (['listen', 'char', 'meaning', 'type'] as ExerciseKind[]).find((k) => !usedKinds.has(k));
      if (missing && r > 2 && ci === 0) kind = missing;
      usedKinds.add(kind);
      out.push(makeExercise(kind, w, words, d));
    }
    if (ci === 0) out.push(makeMatch(words.slice(0, Math.min(words.length, 8))));
  });

  for (const k of ['listen', 'char', 'meaning', 'type'] as ExerciseKind[])
    if (!usedKinds.has(k)) out.push(makeExercise(k, shuffle(words)[0], words, d));

  const sentenceWords = shuffle(words);
  out.push(makeMatch(shuffle(words)));
  out.push(makeSentenceMeaning(sentenceWords[0], words, d));
  const arrangeCount = d === 'hard' ? 3 : 2;
  for (let i = 1; i <= arrangeCount; i++) out.push(makeArrange(sentenceWords[i % sentenceWords.length], words, d));
  if (opts.speaking) out.push(makeExercise('speak', sentenceWords[arrangeCount + 1] ?? words[0], words, d));
  return out;
}

/** Review session for the weakest words – no intro cards, more varied practice. */
export function buildReview(words: Word[], opts: Omit<BuildOpts, 'newWordIds'>): Exercise[] {
  const d = opts.difficulty;
  const out: Exercise[] = [];
  const rot = ROTATION[d];
  shuffle(words).forEach((w, i) => out.push(makeExercise(rot[i % rot.length], w, words, d)));
  if (words.length >= 3) out.splice(Math.min(4, out.length), 0, makeMatch(words));
  const sw = shuffle(words);
  out.push(makeArrange(sw[0], words, d));
  if (sw[1]) out.push(makeSentenceMeaning(sw[1], words, d));
  return out;
}

/** A follow-up exercise for a word the learner missed (appended at the end of the queue). */
export function makeRetry(ex: Exercise, missed: Word[], pool: Word[], d: Difficulty): Exercise[] {
  if (ex.kind === 'arrange') return [makeArrange(ex.word, pool, d)];
  if (ex.kind === 'meaning' && ex.sentence) return [makeSentenceMeaning(ex.word, pool, d)];
  const easier: ExerciseKind[] = ['listen', 'meaning', 'char'];
  return missed.map((w) => {
    const kind = ex.kind === 'type' ? 'type' : easier[Math.floor(Math.random() * easier.length)];
    return makeExercise(kind, w, pool, d === 'hard' ? 'normal' : d);
  });
}

/** End-of-part test: 10 questions mixing listening, meaning, pinyin and sentence building. */
export function buildTest(words: Word[], count = 10): Exercise[] {
  const picked = shuffle(words).slice(0, count);
  const kinds: ExerciseKind[] = ['listen', 'listen', 'listen', 'meaning', 'meaning', 'type', 'type', 'arrange', 'arrange', 'arrange'];
  return shuffle(
    picked.map((w, i) => {
      const k = kinds[i % kinds.length];
      if (k === 'arrange') return makeArrange(w, words, 'normal');
      if (k === 'meaning' && i % 2) return makeSentenceMeaning(w, words, 'normal');
      return makeExercise(k, w, words, 'normal');
    }),
  );
}
