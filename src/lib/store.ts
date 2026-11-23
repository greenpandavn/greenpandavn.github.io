import { useSyncExternalStore } from 'react';
import type { CourseId, CourseProgress, Progress } from '../types';
import { getCourse, onCourseChange, unitLevel } from '../data';
import { dateKey, addDays } from './date';
import { updateWord } from './srs';
import { achievements, type Achievement } from './gamification';
import { setSpeechRate } from './speech';
import { setSfxEnabled } from './sound';
import { applyTheme } from './theme';

export const GUEST_KEY = 'hoc-tieng-trung-progress-v1';
let storageKey = GUEST_KEY;
export const DAILY_GOAL_GEMS = 10;

export function defaultProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    gems: 50,
    lessons: {},
    unlockedBonus: [],
    words: {},
    streak: { current: 0, longest: 0, lastDate: null },
    days: {},
    achievements: {},
    recent: [],
    reviews: 0,
    perfectLessons: 0,
    bestCombo: 0,
    goalBonusDates: [],
    certificates: [],
    tests: [],
    lessonStats: {},
    settings: {
      sound: true,
      rate: 0.8,
      dailyGoal: 20,
      speaking: true,
      name: '',
      reminderOn: true,
      reminderTime: '19:00',
      level: '',
      theme: 'leaf',
      dark: false,
    },
  };
}

export const COURSE_KEYS = [
  'xp',
  'lessons',
  'unlockedBonus',
  'words',
  'streak',
  'days',
  'achievements',
  'recent',
  'reviews',
  'perfectLessons',
  'bestCombo',
  'goalBonusDates',
  'certificates',
  'tests',
  'lessonStats',
] as const;

/** The per-course slice of a flat progress object. */
export function coursePart(p: Progress): CourseProgress {
  const out: Record<string, unknown> = { level: p.settings.level };
  for (const k of COURSE_KEYS) out[k] = p[k];
  return out as unknown as CourseProgress;
}

/** A flat progress object for one course: shared fields (gems, settings) + that course's own progress. */
export function courseView(stored: Progress, course: CourseId): Progress {
  if (course === 'zh') return stored;
  const { level, ...part } = stored[course] ?? coursePart(defaultProgress());
  return { ...stored, ...part, settings: { ...stored.settings, level }, en: undefined, ko: undefined, ja: undefined };
}

/** Write a course view back into the stored form (Chinese at the top level, English under `en`). */
function foldView(stored: Progress, view: Progress, course: CourseId): Progress {
  if (course === 'zh') return { ...view, en: stored.en, ko: stored.ko, ja: stored.ja };
  const out: Progress = { ...stored, gems: view.gems, mock: view.mock, settings: { ...view.settings, level: stored.settings.level }, [course]: coursePart(view) };
  return out;
}

/** XP of each course and their sum (the shared leaderboard uses the total). */
export function xpByCourse(stored: Progress = state) {
  const zh = stored.xp;
  const en = stored.en?.xp ?? 0;
  const ko = stored.ko?.xp ?? 0;
  const ja = stored.ja?.xp ?? 0;
  return { zh, en, ko, ja, total: zh + en + ko + ja };
}

function sanitizeCourse(raw: unknown): CourseProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<CourseProgress>;
  if (typeof r.xp !== 'number' || !r.lessons || typeof r.lessons !== 'object') return undefined;
  const d = coursePart(defaultProgress());
  return {
    ...d,
    ...r,
    streak: { ...d.streak, ...(r.streak || {}) },
    words: r.words && typeof r.words === 'object' ? r.words : {},
    days: r.days && typeof r.days === 'object' ? r.days : {},
    achievements: r.achievements && typeof r.achievements === 'object' ? r.achievements : {},
    lessonStats: r.lessonStats && typeof r.lessonStats === 'object' ? r.lessonStats : {},
    unlockedBonus: Array.isArray(r.unlockedBonus) ? r.unlockedBonus : [],
    recent: Array.isArray(r.recent) ? r.recent : [],
    goalBonusDates: Array.isArray(r.goalBonusDates) ? r.goalBonusDates : [],
    certificates: Array.isArray(r.certificates) ? r.certificates : [],
    tests: Array.isArray(r.tests) ? r.tests : [],
    level: r.level || (Object.keys(r.lessons).length > 0 ? 'new' : ''),
  };
}

export function sanitize(raw: unknown): Progress {
  const d = defaultProgress();
  if (!raw || typeof raw !== 'object') throw new Error('invalid');
  const r = raw as Partial<Progress>;
  if (typeof r.xp !== 'number' || typeof r.lessons !== 'object') throw new Error('invalid');
  const settings = { ...d.settings, ...(r.settings || {}) };
  // Learners from before the level picker existed already have a path – don't ask them again.
  if (!r.settings?.level && Object.keys(r.lessons).length > 0) settings.level = 'new';
  return {
    ...d,
    ...r,
    streak: { ...d.streak, ...(r.streak || {}) },
    settings,
    lessonStats: r.lessonStats && typeof r.lessonStats === 'object' ? r.lessonStats : {},
    certificates: Array.isArray(r.certificates) ? r.certificates : [],
    tests: Array.isArray(r.tests) ? r.tests : [],
    en: sanitizeCourse(r.en),
    ko: sanitizeCourse(r.ko),
    ja: sanitizeCourse(r.ja),
    mock: r.mock && typeof r.mock === 'object' ? r.mock : undefined,
    version: 1,
  } as Progress;
}

export function loadFrom(key: string): Progress | null {
  try {
    const s = localStorage.getItem(key);
    if (s) return sanitize(JSON.parse(s));
  } catch {
    /* ignore corrupted storage */
  }
  return null;
}

function load(): Progress {
  try {
    const s = localStorage.getItem(storageKey);
    if (s) return sanitize(JSON.parse(s));
  } catch {
    /* ignore corrupted storage */
  }
  return defaultProgress();
}

// `state` is the stored form (all courses); `view` is the active course, which is what the app reads.
let state: Progress = load();
let view: Progress = courseView(state, getCourse());
const listeners = new Set<() => void>();
type ChangeSource = 'local' | 'remote';
const changeHooks = new Set<(p: Progress) => void>();
/** Subscribe to progress changes made by this device (not ones applied from the cloud). */
export function onLocalChange(fn: (p: Progress) => void) {
  changeHooks.add(fn);
  return () => changeHooks.delete(fn);
}

function applySettings() {
  // the level differs per course, the rest of the settings are shared
  setSpeechRate(state.settings.rate);
  setSfxEnabled(state.settings.sound);
  applyTheme(state.settings.theme, state.settings.dark);
}
applySettings();

function set(next: Progress, source: ChangeSource = 'local') {
  state = next;
  view = courseView(state, getCourse());
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* storage full / private mode */
  }
  applySettings();
  listeners.forEach((l) => l());
  if (source === 'local') changeHooks.forEach((h) => h(state));
}

/** Switch the active storage slot (guest or a signed-in user's offline cache) and load `p` into it. */
export function switchStorageSlot(key: string, p: Progress) {
  storageKey = key;
  set(p, 'remote');
}
export const activeStorageKey = () => storageKey;
/** Replace progress with data coming from the cloud (does not trigger an upload). */
export const applyRemote = (p: Progress) => set(p, 'remote');

/** Progress of the active course (shared gems/settings included). */
export const getProgress = () => view;
/** Everything that is saved and synced: the Chinese course at the top level, English under `en`. */
export const getStored = () => state;
export const updateProgress = (fn: (p: Progress) => Progress) => set(foldView(state, fn(view), getCourse()));
onCourseChange(() => {
  view = courseView(state, getCourse());
  listeners.forEach((l) => l());
});

export function useProgress() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
  );
}

/** Record an answer for spaced repetition & adaptive difficulty. */
export function recordAnswer(wordIds: string[], correct: boolean) {
  updateProgress((p) => {
    const words = { ...p.words };
    for (const id of wordIds) words[id] = updateWord(words[id], correct);
    return { ...p, words, recent: [...p.recent, correct].slice(-30) };
  });
}

/** Add XP: updates daily total, streak and daily-goal bonus. Returns info for the UI. */
export function addXp(amount: number) {
  const today = dateKey();
  let streakExtended = false;
  let goalReached = false;
  updateProgress((p) => {
    const days = { ...p.days, [today]: (p.days[today] ?? 0) + amount };
    const streak = { ...p.streak };
    if (streak.lastDate !== today) {
      streak.current = streak.lastDate === addDays(today, -1) ? streak.current + 1 : 1;
      streak.lastDate = today;
      streak.longest = Math.max(streak.longest, streak.current);
      streakExtended = true;
    }
    let gems = p.gems;
    let goalBonusDates = p.goalBonusDates;
    if (days[today] >= p.settings.dailyGoal && !p.goalBonusDates.includes(today)) {
      goalReached = true;
      gems += DAILY_GOAL_GEMS;
      goalBonusDates = [...p.goalBonusDates.slice(-60), today];
    }
    return { ...p, xp: p.xp + amount, days, streak, gems, goalBonusDates };
  });
  return { streakExtended, goalReached };
}

export function addGems(n: number) {
  updateProgress((p) => ({ ...p, gems: p.gems + n }));
}

export function spendGems(n: number) {
  if (view.gems < n) return false;
  updateProgress((p) => ({ ...p, gems: p.gems - n }));
  return true;
}

export function completeLesson(lessonId: string, accuracy: number) {
  updateProgress((p) => {
    const prev = p.lessons[lessonId] ?? { completed: 0, bestAccuracy: 0 };
    return {
      ...p,
      lessons: { ...p.lessons, [lessonId]: { completed: prev.completed + 1, bestAccuracy: Math.max(prev.bestAccuracy, accuracy) } },
      perfectLessons: p.perfectLessons + (accuracy >= 1 ? 1 : 0),
    };
  });
}

export function failLesson(lessonId: string) {
  updateProgress((p) => ({
    ...p,
    lessonStats: { ...p.lessonStats, [lessonId]: { fails: (p.lessonStats[lessonId]?.fails ?? 0) + 1 } },
  }));
}

export function noteCombo(combo: number) {
  if (combo > view.bestCombo) updateProgress((p) => ({ ...p, bestCombo: combo }));
}

/** Unlock new achievements, award their gems, return the newly unlocked ones. */
export function checkAchievements(): Achievement[] {
  const fresh = achievements().filter((a) => !view.achievements[a.id] && a.check(view));
  if (fresh.length) {
    const today = dateKey();
    updateProgress((p) => ({
      ...p,
      gems: p.gems + fresh.reduce((n, a) => n + a.gems, 0),
      achievements: { ...p.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, today])) },
    }));
  }
  return fresh;
}

export function exportProgress() {
  return JSON.stringify({ app: 'hoc-tieng-trung', exportedAt: new Date().toISOString(), progress: state }, null, 2);
}

export function importProgress(text: string) {
  const parsed = JSON.parse(text);
  set(sanitize(parsed.progress ?? parsed));
}

export function resetProgress() {
  set(defaultProgress());
}

/** Save a 'Thi thử HSK' attempt; keeps the best score per level. Works for guests and syncs like the rest. */
export function recordMock(level: number | string, score: number, max: number, passed: boolean) {
  updateProgress((p) => {
    const prev = p.mock?.[level];
    const better = !prev || score > prev.best;
    return {
      ...p,
      mock: {
        ...p.mock,
        [level]: {
          best: better ? score : prev.best,
          max,
          passed: better ? passed : prev.passed,
          attempts: (prev?.attempts ?? 0) + 1,
          last: score,
          date: better ? dateKey() : prev.date,
        },
      },
    };
  });
}

export const TEST_PASS = 0.8;
/** Save a part-test result; issues (or upgrades) the certificate when passed. */
export function recordTest(unit: number, part: string, name: string, correct: number, total: number) {
  const date = dateKey();
  const passed = correct / total >= TEST_PASS;
  const score = Math.round((correct / total) * 100);
  let cert: import('../types').Certificate | null = null;
  updateProgress((p) => {
    const tests = [...p.tests, { unit, correct, total, passed, date }].slice(-50);
    if (!passed) return { ...p, tests };
    // Chinese: hsk1-part1…3 (kept from v2), hsk2-part21…; English: en-part1…
    const id = getCourse() === 'zh' ? `hsk${unitLevel(unit)}-part${unit}` : `${getCourse()}-part${unit}`;
    const prev = p.certificates.find((c) => c.id === id);
    cert = prev && prev.score >= score ? prev : { id, unit, part, name, score, correct, total, date };
    return { ...p, tests, certificates: [...p.certificates.filter((c) => c.id !== id), cert].sort((a, b) => a.unit - b.unit) };
  });
  return { passed, score, cert: cert as import('../types').Certificate | null };
}
