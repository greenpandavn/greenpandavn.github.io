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

// The word lists are big, so they are separate chunks, fetched when a course is opened (see loadCourse):
// English is one chunk, Chinese one chunk per level (HSK 1–3 together).
export let BUNDLED_LESSONS: RawLesson[] = [];
export let BUNDLED_UNITS: Unit[] = [];
export let EN_LESSONS: RawLesson[] = [];
export let EN_UNITS: Unit[] = [];

export const COURSES: { id: CourseId; label: string; title: string; desc: string; glyph: string }[] = [
  { id: 'zh', label: 'Tiếng Trung', title: 'Khóa học tiếng Trung HSK 1–9', desc: 'HSK 1 → HSK 9 · chữ Hán, pinyin, luyện nghe nói', glyph: '中' },
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
interface RawData {
  lessons: RawLesson[];
  units: Unit[];
}
const ZH_CHUNKS = import.meta.glob<{ default: RawData }>('./zh/*.json');
const ZH_BASE = './zh/hsk1-3.json';
const zhChunkOf = (level: number) => (ZH_CHUNKS[`./zh/hsk${level}.json`] ? `./zh/hsk${level}.json` : ZH_BASE);
const LEVEL_KEY = 'gp-zh-level';
/** Remember the HSK level being studied, so that its chunk is waited for on the next launch. */
export function noteLevel(level: number) {
  try {
    if (localStorage.getItem(LEVEL_KEY) !== String(level)) localStorage.setItem(LEVEL_KEY, String(level));
  } catch {
    /* private mode */
  }
}
function zhPriority() {
  let level = 1;
  try {
    level = Number(localStorage.getItem(LEVEL_KEY)) || 1;
  } catch {
    /* private mode */
  }
  return [...new Set([ZH_BASE, zhChunkOf(level)])];
}
const loaded = new Set<string>(); // 'en', 'zh' (every level) and the Chinese chunks
const loading = new Map<string, Promise<void>>();
let pending: CourseId | null = null;
let loadFailed = false;
function once(key: string, start: () => Promise<void>) {
  let job = loading.get(key);
  if (!job) {
    job = start().then(
      () => void loaded.add(key),
      (e) => {
        loading.delete(key);
        throw e;
      },
    );
    loading.set(key, job);
  }
  return job;
}
const loadZhChunk = (key: string) =>
  once(key, async () => {
    const raw = (await ZH_CHUNKS[key]()).default;
    BUNDLED_LESSONS = [...BUNDLED_LESSONS, ...raw.lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    BUNDLED_UNITS = [...BUNDLED_UNITS, ...raw.units].sort((a, b) => a.unit - b.unit);
    if (course === 'zh') build(overrides);
    notify();
  });
/** Fetch all the lessons of a course (once). Resolves when every level is available. */
export function loadCourse(c: CourseId): Promise<void> {
  if (c === 'zh')
    return once('zh', async () => {
      await Promise.all(Object.keys(ZH_CHUNKS).map(loadZhChunk));
      notify();
    });
  return once('en', async () => {
    const raw = (await import('./english.json')).default as unknown as RawData;
    [EN_LESSONS, EN_UNITS] = [raw.lessons.map((l, i) => ({ ...l, order: (i + 1) * 10 })), raw.units];
    if (course === 'en') build(overrides);
    notify();
  });
}
/** True when every level of the course is in memory. */
export const courseLoaded = (c: CourseId = course) => loaded.has(c);
/** Enough to show the course: English entirely; Chinese HSK 1–3 plus the level being studied (the rest follows). */
const usable = (c: CourseId) => (c === 'en' ? loaded.has('en') : zhPriority().every((k) => loaded.has(k)));
function loadUsable(c: CourseId): Promise<unknown> {
  const all = loadCourse(c);
  if (c === 'en') return all;
  all.catch(() => {}); // the other levels keep loading in the background
  return Promise.all(zhPriority().map(loadZhChunk));
}
/** 'ready' when the active course can be shown; 'loading' / 'error' while its data is fetched. */
export const courseState = (): 'ready' | 'loading' | 'error' => (loadFailed ? 'error' : pending || !usable(course) ? 'loading' : 'ready');
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
  if (usable(c)) {
    pending = null;
    activate(c);
    loadUsable(c).catch(() => {});
    return;
  }
  pending = c;
  notify();
  loadUsable(c).then(
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
  loadUsable(course).catch(() => {
    if (usable(course)) return; // a background level failed: it is retried on the next call
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
