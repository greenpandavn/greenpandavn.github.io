import raw from './lessons.json';
import type { Lesson, Word } from '../types';

type RawLesson = Omit<Lesson, 'words'> & { words: Omit<Word, 'lessonId'>[] };

export const LESSONS: Lesson[] = (raw.lessons as RawLesson[]).map((l) => ({
  ...l,
  words: l.words.map((w) => ({ ...w, lessonId: l.id })),
}));

export const CORE_LESSONS = LESSONS.filter((l) => !l.bonus);
export const BONUS_LESSONS = LESSONS.filter((l) => l.bonus);
export const ALL_WORDS: Word[] = LESSONS.flatMap((l) => l.words);
export const WORD_BY_ID: Record<string, Word> = Object.fromEntries(ALL_WORDS.map((w) => [w.id, w]));
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

export const UNITS = [
  { unit: 1, title: 'Phần 1: Làm quen', desc: 'Chào hỏi, giới thiệu, số đếm, gia đình', color: 'leaf' },
  { unit: 2, title: 'Phần 2: Cuộc sống hằng ngày', desc: 'Ăn uống, màu sắc, thời gian, trường học', color: 'sky' },
  { unit: 3, title: 'Phần 3: Khám phá thế giới', desc: 'Động vật, nhà cửa, du lịch, thời tiết', color: 'grape' },
] as const;

const PUNCT = /^[，。？！]$/;
export const isPunct = (t: string) => PUNCT.test(t);

export function sentenceZh(w: Word) {
  return w.ex.tokens.join('');
}

export function sentencePinyin(w: Word) {
  let out = '';
  w.ex.py.forEach((p, i) => {
    if (/^[,.?!]$/.test(p)) out += p;
    else out += (i ? ' ' : '') + p;
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function sentenceTiles(w: Word) {
  return w.ex.tokens
    .map((t, i) => ({ zh: t, py: w.ex.py[i] }))
    .filter((t) => !isPunct(t.zh));
}
