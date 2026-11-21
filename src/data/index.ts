import { useSyncExternalStore } from 'react';
import type { CourseId, Lesson, Word } from '../types';

export type RawWord = Omit<Word, 'lessonId'>;
export type RawLesson = Omit<Lesson, 'words'> & { words: RawWord[] };
export interface Unit {
  unit: number;
  title: string;
  desc: string;
  color: string;
  /** HSK level (Chinese course); units of one level are shown together. */
  level?: number;
}
/** A Firestore content document: a full lesson/unit, or a tombstone hiding a bundled one. */
export type LessonDoc = RawLesson | { id: string; deleted: true };
export type UnitDoc = Unit | { unit: number; deleted: true };
export interface ContentOverrides {
  lessons: LessonDoc[];
  units: UnitDoc[];
}

// The word lists are big, so each course is its own chunk, fetched when that course is opened (see loadCourse).
export let BUNDLED_LESSONS: RawLesson[] = [];
export let BUNDLED_UNITS: Unit[] = [];
export let EN_LESSONS: RawLesson[] = [];
export let EN_UNITS: Unit[] = [];

export const COURSES: { id: CourseId; label: string; title: string; desc: string; glyph: string }[] = [
  { id: 'zh', label: 'Tiếng Trung', title: 'Khóa học tiếng Trung HSK 1–6', desc: 'HSK 1 → HSK 6 · chữ Hán, pinyin, luyện nghe nói', glyph: '中' },
  { id: 'en', label: 'Tiếng Anh', title: 'Khóa học tiếng Anh từ sơ cấp đến thành thạo', desc: 'Sơ cấp → Thành thạo · từ vựng, chính tả, luyện nghe nói', glyph: 'En' },
];
const COURSE_KEY = 'gp-course';
function storedCourse(): CourseId | null {
  try {
    const c = typeof localStorage !== 'undefined' ? localStorage.getItem(COURSE_KEY) : null;
    return c === 'zh' || c === 'en' ? c : null;
  } catch {
    return null;
  }
}
let chosen = storedCourse() !== null;
let course: CourseId = storedCourse() ?? 'zh';
let overrides: ContentOverrides | null = null;
/** The course being studied on this device. All the live bindings below belong to it. */
export const getCourse = () => course;
export const isEnglish = () => course === 'en';
/** False until the learner has picked a course on this device. */
export const courseChosen = () => chosen;
export const courseInfo = (id: CourseId = course) => COURSES.find((c) => c.id === id)!;
const courseHooks = new Set<() => void>();
/** Runs right after the active course changed, before React re-renders. */
export function onCourseChange(fn: () => void) {
  courseHooks.add(fn);
}
const notify = () => {
  version++;
  listeners.forEach((l) => l());
};
const loaded = new Set<CourseId>();
const loading = new Map<CourseId, Promise<void>>();
let pending: CourseId | null = null;
let loadFailed = false;
/** 'ready' when the words of the active course are in memory; 'loading' / 'error' while its chunk is fetched. */
export const courseState = (): 'ready' | 'loading' | 'error' => (loadFailed ? 'error' : pending || !loaded.has(course) ? 'loading' : 'ready');
/** Fetch the lessons of a course (once). Resolves when they are available. */
export function loadCourse(c: CourseId): Promise<void> {
  let job = loading.get(c);
  if (!job) {
    job = (c === 'en' ? import('./english.json') : import('./lessons.json')).then(
      (m) => {
        const raw = m.default as unknown as { lessons: RawLesson[]; units: Unit[] };
        const lessons = raw.lessons.map((l, i) => ({ ...l, order: (i + 1) * 10 }));
        if (c === 'en') [EN_LESSONS, EN_UNITS] = [lessons, raw.units];
        else [BUNDLED_LESSONS, BUNDLED_UNITS] = [lessons, raw.units];
        loaded.add(c);
        if (c === course) build(overrides);
        notify();
      },
      (e) => {
        loading.delete(c);
        throw e;
      },
    );
    loading.set(c, job);
  }
  return job;
}
function activate(c: CourseId) {
  course = c;
  build(overrides);
  courseHooks.forEach((h) => h());
  notify();
}
/** Switch course. The switch happens at once when its lessons are loaded, otherwise as soon as they arrive. */
export function setCourse(c: CourseId) {
  chosen = true;
  try {
    localStorage.setItem(COURSE_KEY, c);
  } catch {
    /* private mode */
  }
  loadFailed = false;
  if (loaded.has(c)) {
    pending = null;
    activate(c);
    return;
  }
  pending = c;
  notify();
  loadCourse(c).then(
    () => {
      if (pending !== c) return;
      pending = null;
      activate(c);
    },
    () => {
      if (pending !== c) return;
      loadFailed = true;
      notify();
    },
  );
}
/** Try again after a failed download of the course data. */
export function retryCourse() {
  const c = pending ?? course;
  loadFailed = false;
  if (pending) return setCourse(c);
  notify();
  ensureCourse();
}
/** HSK level of a unit (1 when the unit has none, e.g. the English course). */
/** Name of a level of the active course, e.g. 'HSK 4' or 'Trung cấp'. */
export const EN_LEVEL_LABEL = ['Sơ cấp', 'Trung cấp', 'Nâng cao', 'Thành thạo'];
export const levelLabel = (level: number, c: CourseId = course) => (c === 'en' ? (EN_LEVEL_LABEL[level - 1] ?? EN_LEVEL_LABEL[0]) : `HSK ${level}`);
export const unitLevel = (unit: number) => UNITS.find((u) => u.unit === unit)?.level ?? 1;

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
  overrides = o;
  if (course === 'en') o = null; // admin-managed content only exists for the Chinese course
  const lessonMap = new Map<string, RawLesson>((course === 'en' ? EN_LESSONS : BUNDLED_LESSONS).map((l) => [l.id, l]));
  const unitMap = new Map<number, Unit>((course === 'en' ? EN_UNITS : BUNDLED_UNITS).map((u) => [u.unit, u]));
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
/** Start fetching the active course if that has not happened yet (no-op once it is loading or ready). */
export function ensureCourse() {
  if (loaded.has(course) || pending || loadFailed) return;
  loadCourse(course).catch(() => {
    loadFailed = true;
    notify();
  });
}
// A returning learner needs the saved course right away; a new visitor loads it after picking one.
if (chosen) ensureCourse();

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

const PUNCT = /^[，。？！、；：,.?!;:]$/;
const hasHan = (s: string) => /\p{Script=Han}/u.test(s);
export const isPunct = (t: string) => PUNCT.test(t);

/** The example sentence as written: Chinese has no spaces, English words are separated by spaces. */
export function sentenceZh(w: Word) {
  if (hasHan(w.ex.tokens.join(''))) return w.ex.tokens.join('');
  return w.ex.tokens.reduce((out, t, i) => out + (i && !isPunct(t) ? ' ' : '') + t, '');
}

/** Normalised form used to compare an arranged sentence with the accepted answers. */
export const sentenceKey = (s: string) => (hasHan(s) ? s.replace(/[，。？！、；：\s]/g, '') : s.toLowerCase().replace(/[^a-z0-9]/g, ''));

export function sentencePinyin(w: Word) {
  if (!w.pinyin && w.ex.py.every((p) => !p || isPunct(p))) return '';
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
