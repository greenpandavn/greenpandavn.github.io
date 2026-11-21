import { useSyncExternalStore } from 'react';
import raw from './lessons.json';
import type { Lesson, Word } from '../types';

export type RawWord = Omit<Word, 'lessonId'>;
export type RawLesson = Omit<Lesson, 'words'> & { words: RawWord[] };
export interface Unit {
  unit: number;
  title: string;
  desc: string;
  color: string;
}
/** A Firestore content document: a full lesson/unit, or a tombstone hiding a bundled one. */
export type LessonDoc = RawLesson | { id: string; deleted: true };
export type UnitDoc = Unit | { unit: number; deleted: true };
export interface ContentOverrides {
  lessons: LessonDoc[];
  units: UnitDoc[];
}

export const BUNDLED_LESSONS: RawLesson[] = (raw.lessons as RawLesson[]).map((l, i) => ({ ...l, order: (i + 1) * 10 }));
export const BUNDLED_UNITS: Unit[] = [
  { unit: 1, title: 'Phần 1: Làm quen', desc: 'Chào hỏi, giới thiệu, số đếm, gia đình', color: 'leaf' },
  { unit: 2, title: 'Phần 2: Cuộc sống hằng ngày', desc: 'Ăn uống, màu sắc, thời gian, trường học', color: 'sky' },
  { unit: 3, title: 'Phần 3: Khám phá thế giới', desc: 'Động vật, nhà cửa, du lịch, thời tiết', color: 'grape' },
];

// Live bindings: reassigned when admin-managed content arrives from Firestore.
export let LESSONS: Lesson[] = [];
export let CORE_LESSONS: Lesson[] = [];
export let BONUS_LESSONS: Lesson[] = [];
export let ALL_WORDS: Word[] = [];
export let WORD_BY_ID: Record<string, Word> = {};
export let LESSON_BY_ID: Record<string, Lesson> = {};
export let UNITS: Unit[] = [];
export let contentSource: 'bundled' | 'cloud' = 'bundled';

const CONTENT_KEY = 'hoc-tieng-trung-content-v1';
let version = 0;
const listeners = new Set<() => void>();

function build(o: ContentOverrides | null) {
  const lessonMap = new Map<string, RawLesson>(BUNDLED_LESSONS.map((l) => [l.id, l]));
  const unitMap = new Map<number, Unit>(BUNDLED_UNITS.map((u) => [u.unit, u]));
  for (const d of o?.lessons ?? []) {
    if ('deleted' in d) lessonMap.delete(d.id);
    else if (d.id && Array.isArray(d.words)) lessonMap.set(d.id, d);
  }
  for (const d of o?.units ?? []) {
    if ('deleted' in d) unitMap.delete(d.unit);
    else if (d.unit) unitMap.set(d.unit, d);
  }
  const sorted = [...lessonMap.values()].sort((a, b) => a.unit - b.unit || (a.order ?? 9999) - (b.order ?? 9999));
  LESSONS = sorted.map((l) => ({ ...l, words: l.words.map((w) => ({ ...w, lessonId: l.id })) }));
  for (const l of LESSONS) if (!unitMap.has(l.unit)) unitMap.set(l.unit, { unit: l.unit, title: `Phần ${l.unit}`, desc: '', color: 'leaf' });
  UNITS = [...unitMap.values()].filter((u) => LESSONS.some((l) => l.unit === u.unit)).sort((a, b) => a.unit - b.unit);
  CORE_LESSONS = LESSONS.filter((l) => !l.bonus);
  BONUS_LESSONS = LESSONS.filter((l) => l.bonus);
  ALL_WORDS = LESSONS.flatMap((l) => l.words);
  WORD_BY_ID = Object.fromEntries(ALL_WORDS.map((w) => [w.id, w]));
  LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
  contentSource = o && (o.lessons.length || o.units.length) ? 'cloud' : 'bundled';
}

function cached(): ContentOverrides | null {
  try {
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem(CONTENT_KEY) : null;
    return s ? (JSON.parse(s) as ContentOverrides) : null;
  } catch {
    return null;
  }
}
build(cached());

/** Apply admin content from Firestore (cached for offline use); bundled content fills any gaps. */
export function applyContent(o: ContentOverrides) {
  try {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(o));
  } catch {
    /* storage full */
  }
  build(o);
  version++;
  listeners.forEach((l) => l());
}

export function useContentVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
}

const PUNCT = /^[，。？！、；：]$/;
export const isPunct = (t: string) => PUNCT.test(t);

export function sentenceZh(w: Word) {
  return w.ex.tokens.join('');
}

export function sentencePinyin(w: Word) {
  let out = '';
  w.ex.py.forEach((p, i) => {
    if (/^[,.?!;:]$/.test(p)) out += p;
    else out += (i ? ' ' : '') + p;
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function sentenceTiles(w: Word) {
  return w.ex.tokens
    .map((t, i) => ({ zh: t, py: w.ex.py[i] }))
    .filter((t) => !isPunct(t.zh));
}
