import { useSyncExternalStore } from "react";
import type { CourseId, Lesson, Word } from "../types";
import zhMeta from "./zh/meta.json";
import enMeta from "./en/meta.json";
import koMeta from "./ko/meta.json";
import jaMeta from "./ja/meta.json";
import thMeta from "./th/meta.json";

export type RawWord = Omit<Word, "lessonId">;
export type RawLesson = Omit<Lesson, "words" | "wordCount"> & { words: RawWord[] };
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

// The word lists are big, so every part (unit) of a course is a separate chunk, fetched when one of its lessons is
// needed (see loadUnits). The lesson path itself is drawn from the small bundled meta files.
type MetaLesson = [id: string, title: string, icon: string, unit: number, words: number, cost?: number];
interface Meta {
  units: Unit[];
  lessons: MetaLesson[];
}
/** A lesson as known before its part is downloaded: no words and no description yet. */
const stubs = (meta: Meta, c: CourseId): RawLesson[] =>
  meta.lessons.map(([id, title, icon, unit, , cost], i) => ({
    id,
    title,
    desc: "",
    icon,
    unit,
    ...(cost === undefined ? {} : { bonus: true, cost }),
    ...(c === "zh" ? {} : { course: c }),
    order: (i + 1) * 10,
    words: [],
  }));
// parts are listed level by level (the later English parts of a level have higher unit numbers than the next level's first ones)
const byUnit = (a: Unit, b: Unit) =>
  (a.level ?? 1) - (b.level ?? 1) || a.unit - b.unit;
export const COURSE_IDS: CourseId[] = ["zh", "en", "ko", "ja", "th"];
const META: Record<CourseId, Meta> = {
  zh: zhMeta as unknown as Meta,
  en: enMeta as unknown as Meta,
  ko: koMeta as unknown as Meta,
  ja: jaMeta as unknown as Meta,
  th: thMeta as unknown as Meta,
};
const STUBS = Object.fromEntries(
  COURSE_IDS.map((c) => [c, stubs(META[c], c)]),
) as Record<CourseId, RawLesson[]>;
const WORD_COUNT = new Map<string, number>(
  COURSE_IDS.flatMap((c) => META[c].lessons).map((l) => [l[0], l[4]]),
);
/** The bundled lessons whose words are in memory (all of them once loadCourse has finished). */
export let BUNDLED_LESSONS: RawLesson[] = [];
export const BUNDLED_UNITS: Unit[] = [...META.zh.units].sort(byUnit);
export let EN_LESSONS: RawLesson[] = [];
export const EN_UNITS: Unit[] = [...META.en.units].sort(byUnit);
const COURSE_UNITS: Record<CourseId, Unit[]> = {
  zh: BUNDLED_UNITS,
  en: EN_UNITS,
  ko: [...META.ko.units].sort(byUnit),
  ja: [...META.ja.units].sort(byUnit),
  th: [...META.th.units].sort(byUnit),
};
/** Lessons of each course whose words are in memory. */
const COURSE_LESSONS: Record<CourseId, RawLesson[]> = { zh: [], en: [], ko: [], ja: [], th: [] };
export const courseUnits = (c: CourseId) => COURSE_UNITS[c];
export const courseLessons = (c: CourseId) => COURSE_LESSONS[c];
const unitsOf = (c: CourseId) => COURSE_UNITS[c];
/** True for a lesson that ships with the app (even when its words are not downloaded yet). */
export const isBundledLesson = (id: string) => WORD_COUNT.has(id);
/** Parts (units) of one level of a course. */
export const levelUnits = (level: number, c: CourseId = course) =>
  unitsOf(c)
    .filter((u) => (u.level ?? 1) === level)
    .map((u) => u.unit);
/** Number of bundled words of one level of a course (known without downloading it). */
export function levelWordCount(level: number, c: CourseId = course) {
  const units = new Set(levelUnits(level, c));
  return META[c].lessons.reduce((n, l) => n + (units.has(l[3]) ? l[4] : 0), 0);
}

/** Number of bundled words of a whole course (known without downloading it). */
export const courseWordCount = (c: CourseId) =>
  META[c].lessons.reduce((n, l) => n + l[4], 0);

export const COURSES: {
  id: CourseId;
  label: string;
  title: string;
  desc: string;
  glyph: string;
}[] = [
  {
    id: "zh",
    label: "Tiếng Trung",
    title: "Khóa học tiếng Trung HSK 1–9",
    desc: "HSK 1 → HSK 9 · chữ Hán, pinyin, luyện nghe nói",
    glyph: "中",
  },
  {
    id: "en",
    label: "Tiếng Anh",
    title: "Khóa học tiếng Anh từ sơ cấp đến chuyên sâu",
    desc: "Sơ cấp → Chuyên sâu · từ vựng, chính tả, luyện nghe nói",
    glyph: "En",
  },
  {
    id: "ko",
    label: "Tiếng Hàn",
    title: "Khóa học tiếng Hàn TOPIK 1–6",
    desc: "TOPIK 1 → TOPIK 6 · Hangul, phiên âm, luyện nghe nói",
    glyph: "한",
  },
  {
    id: "ja",
    label: "Tiếng Nhật",
    title: "Khóa học tiếng Nhật JLPT N5–N1",
    desc: "JLPT N5 → N1 · Kanji, Kana, romaji, luyện nghe nói",
    glyph: "あ",
  },
  {
    id: "th",
    label: "Tiếng Thái",
    title: "Khóa học tiếng Thái từ sơ cấp đến chuyên sâu",
    desc: "Sơ cấp → Chuyên sâu · chữ Thái, phiên âm, luyện nghe nói",
    glyph: "ก",
  },
];
/** Name of the language of a course, e.g. "tiếng Hàn". */
export const langName = (c: CourseId = course) =>
  COURSES.find((x) => x.id === c)!.label.replace(/^T/, "t");
const COURSE_KEY = "gp-course";
function storedCourse(): CourseId | null {
  try {
    const c =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(COURSE_KEY)
        : null;
    return COURSE_IDS.includes(c as CourseId) ? (c as CourseId) : null;
  } catch {
    return null;
  }
}
let chosen = storedCourse() !== null;
let course: CourseId = storedCourse() ?? "zh";
let overrides: ContentOverrides | null = null;
/** The course being studied on this device. All the live bindings below belong to it. */
export const getCourse = () => course;
export const isEnglish = () => course === "en";
/** Korean, Japanese and Thai: words have a script form and a romanization, but no stroke order or tones. */
export const isRoman = (c: CourseId = course) => c === "ko" || c === "ja" || c === "th";
/** False until the learner has picked a course on this device. */
export const courseChosen = () => chosen;
export const courseInfo = (id: CourseId = course) =>
  COURSES.find((c) => c.id === id)!;
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
}
const CHUNKS = {
  ...import.meta.glob<{ default: RawData }>("./zh/u*.json"),
  ...import.meta.glob<{ default: RawData }>("./en/u*.json"),
  ...import.meta.glob<{ default: RawData }>("./ko/u*.json"),
  ...import.meta.glob<{ default: RawData }>("./ja/u*.json"),
  ...import.meta.glob<{ default: RawData }>("./th/u*.json"),
};
const chunkKey = (c: CourseId, unit: number) => `./${c}/u${unit}.json`;
const FULL: Record<CourseId, Map<string, RawLesson>> = {
  zh: new Map(),
  en: new Map(),
  ko: new Map(),
  ja: new Map(),
  th: new Map(),
};
const ready = new Set<string>(); // chunks in memory
const fetching = new Map<string, Promise<void>>();
let dirty = false;
function fetchUnit(c: CourseId, unit: number) {
  const key = chunkKey(c, unit);
  let job = fetching.get(key);
  if (!job) {
    job = CHUNKS[key]().then(
      (m) => {
        for (const l of m.default.lessons) FULL[c].set(l.id, l);
        ready.add(key);
        dirty = true;
      },
      (e) => {
        fetching.delete(key); // retried on the next call
        throw e;
      },
    );
    fetching.set(key, job);
  }
  return job;
}
/** Rebuild the lesson lists once after a batch of parts has arrived. */
function flush() {
  if (!dirty) return;
  dirty = false;
  const full = (c: CourseId) =>
    [...FULL[c].values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const c of COURSE_IDS) COURSE_LESSONS[c] = full(c);
  [BUNDLED_LESSONS, EN_LESSONS] = [COURSE_LESSONS.zh, COURSE_LESSONS.en];
  build(overrides);
  notify();
}
/** True when the words of these parts are in memory (parts without bundled data count as ready). */
export const unitsReady = (units: number[], c: CourseId = course) =>
  units.every((u) => !CHUNKS[chunkKey(c, u)] || ready.has(chunkKey(c, u)));
/** Fetch the words of some parts of a course (each part is downloaded once). */
export function loadUnits(units: number[], c: CourseId = course): Promise<void> {
  const need = units.filter((u) => !unitsReady([u], c));
  if (!need.length) return Promise.resolve();
  return Promise.all(need.map((u) => fetchUnit(c, u))).then(flush, (e) => {
    flush(); // keep the parts that did arrive
    throw e;
  });
}
/** Fetch every lesson of a course, level by level. Resolves when all of them are available. */
export async function loadCourse(c: CourseId): Promise<void> {
  const levels = [...new Set(unitsOf(c).map((u) => u.level ?? 1))];
  for (const level of levels) await loadUnits(levelUnits(level, c), c);
}
/** True when every lesson of the course is in memory. */
export const courseLoaded = (c: CourseId = course) =>
  unitsReady(
    unitsOf(c).map((u) => u.unit),
    c,
  );
/** Switch course (the lesson path needs no download; the words follow when a lesson is opened). */
const SCRIPT_FONT: Partial<Record<CourseId, string>> = {
  ko: "Noto+Sans+KR",
  ja: "Noto+Sans+JP",
  th: "Noto+Sans+Thai",
};
/** Korean and Japanese get their own glyphs instead of the Chinese font's. */
function scriptFont() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.course = course;
  const family = SCRIPT_FONT[course];
  const id = `font-${course}`;
  if (!family || document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}
export function setCourse(c: CourseId) {
  chosen = true;
  try {
    localStorage.setItem(COURSE_KEY, c);
  } catch {
    /* private mode */
  }
  course = c;
  scriptFont();
  build(overrides);
  courseHooks.forEach((h) => h());
  notify();
}
/** HSK level of a unit (1 when the unit has none, e.g. the English course). */
/** Name of a level of the active course, e.g. 'HSK 4' or 'Trung cấp'. */
export const EN_LEVEL_LABEL = [
  "Sơ cấp",
  "Trung cấp",
  "Nâng cao",
  "Thành thạo",
  "Chuyên sâu",
];
export const levelLabel = (level: number, c: CourseId = course) =>
  c === "en" || c === "th"
    ? (EN_LEVEL_LABEL[level - 1] ?? EN_LEVEL_LABEL[0])
    : c === "ko"
      ? `TOPIK ${level}`
      : c === "ja"
        ? `JLPT N${Math.max(1, 6 - level)}`
        : `HSK ${level}`;
export const unitLevel = (unit: number) =>
  UNITS.find((u) => u.unit === unit)?.level ?? 1;

// Live bindings: reassigned when admin-managed content arrives from Firestore.
export let LESSONS: Lesson[] = [];
export let CORE_LESSONS: Lesson[] = [];
export let BONUS_LESSONS: Lesson[] = [];
export let ALL_WORDS: Word[] = [];
export let WORD_BY_ID: Record<string, Word> = {};
export let LESSON_BY_ID: Record<string, Lesson> = {};
export let UNITS: Unit[] = [];
export let contentSource: "bundled" | "cloud" = "bundled";

const CONTENT_KEY = "hoc-tieng-trung-content-v1";
let version = 0;
const listeners = new Set<() => void>();

function build(o: ContentOverrides | null) {
  overrides = o;
  if (course !== "zh") o = null; // admin-managed content only exists for the Chinese course
  const lessonMap = new Map<string, RawLesson>(
    STUBS[course].map((l) => [l.id, FULL[course].get(l.id) ?? l]),
  );
  const unitMap = new Map<number, Unit>(
    unitsOf(course).map((u) => [u.unit, u]),
  );
  for (const d of o?.lessons ?? []) {
    if ("deleted" in d) lessonMap.delete(d.id);
    else if (d.id && Array.isArray(d.words)) lessonMap.set(d.id, d);
  }
  for (const d of o?.units ?? []) {
    if ("deleted" in d) unitMap.delete(d.unit);
    else if (d.unit) unitMap.set(d.unit, d);
  }
  const sorted = [...lessonMap.values()].sort(
    (a, b) => a.unit - b.unit || (a.order ?? 9999) - (b.order ?? 9999),
  );
  LESSONS = sorted.map((l) => ({
    ...l,
    wordCount: l.words.length || WORD_COUNT.get(l.id) || 0,
    words: l.words.map((w) => ({ ...w, lessonId: l.id })),
  }));
  for (const l of LESSONS)
    if (!unitMap.has(l.unit))
      unitMap.set(l.unit, {
        unit: l.unit,
        title: `Phần ${l.unit}`,
        desc: "",
        color: "leaf",
      });
  UNITS = [...unitMap.values()]
    .filter((u) => LESSONS.some((l) => l.unit === u.unit))
    .sort(byUnit);
  CORE_LESSONS = LESSONS.filter((l) => !l.bonus);
  BONUS_LESSONS = LESSONS.filter((l) => l.bonus);
  ALL_WORDS = LESSONS.flatMap((l) => l.words);
  WORD_BY_ID = Object.fromEntries(ALL_WORDS.map((w) => [w.id, w]));
  LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
  contentSource =
    o && (o.lessons.length || o.units.length) ? "cloud" : "bundled";
}

function cached(): ContentOverrides | null {
  try {
    const s =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(CONTENT_KEY)
        : null;
    return s ? (JSON.parse(s) as ContentOverrides) : null;
  } catch {
    return null;
  }
}
build(cached());

/** The lesson a word id belongs to: word ids are '<lesson id>-<word>'. */
function lessonOfWord(id: string): Lesson | undefined {
  for (let i = id.indexOf("-"); i > 0; i = id.indexOf("-", i + 1)) {
    const l = LESSON_BY_ID[id.slice(0, i)];
    if (l) return l;
  }
  return WORD_BY_ID[id] && LESSON_BY_ID[WORD_BY_ID[id].lessonId];
}
/** Is this word id part of the active course (whether or not its part is downloaded)? */
export const knownWord = (id: string) => !!lessonOfWord(id);
/** The parts that hold the given words, e.g. every word the learner has practised. */
export function unitsOfWords(ids: string[]): number[] {
  const units = new Set<number>();
  for (const id of ids) {
    const l = lessonOfWord(id);
    if (l) units.add(l.unit);
  }
  return [...units];
}
/** Number of words in the active course. */
export const wordTotal = () => LESSONS.reduce((n, l) => n + l.wordCount, 0);

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
// Chinese and Japanese are written without spaces
const hasHan = (s: string) => /[\p{Script=Han}\u3040-\u30ff\u0e00-\u0e7f]/u.test(s);
export const isPunct = (t: string) => PUNCT.test(t);

/** The example sentence as written: Chinese has no spaces, English words are separated by spaces. */
export function sentenceZh(w: Word) {
  if (hasHan(w.ex.tokens.join(""))) return w.ex.tokens.join("");
  return w.ex.tokens.reduce(
    (out, t, i) => out + (i && !isPunct(t) ? " " : "") + t,
    "",
  );
}

/** Normalised form used to compare an arranged sentence with the accepted answers. */
export const sentenceKey = (s: string) =>
  hasHan(s)
    ? s.replace(/[，。？！、；：\s]/g, "")
    : s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function sentencePinyin(w: Word) {
  if (!w.pinyin && w.ex.py.every((p) => !p || isPunct(p))) return "";
  let out = "";
  w.ex.py.forEach((p, i) => {
    if (/^[,.?!;:]$/.test(p)) out += p;
    else out += (i ? " " : "") + p;
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function sentenceTiles(w: Word) {
  return w.ex.tokens
    .map((t, i) => ({ zh: t, py: w.ex.py[i] }))
    .filter((t) => !isPunct(t.zh));
}
scriptFont();
