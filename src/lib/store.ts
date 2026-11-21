import { useSyncExternalStore } from 'react';
import type { Progress } from '../types';
import { dateKey, addDays } from './date';
import { updateWord } from './srs';
import { ACHIEVEMENTS, type Achievement } from './gamification';
import { setSpeechRate } from './speech';
import { setSfxEnabled } from './sound';

const KEY = 'hoc-tieng-trung-progress-v1';
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
    settings: { sound: true, rate: 0.8, dailyGoal: 20, speaking: true },
  };
}

function sanitize(raw: unknown): Progress {
  const d = defaultProgress();
  if (!raw || typeof raw !== 'object') throw new Error('invalid');
  const r = raw as Partial<Progress>;
  if (typeof r.xp !== 'number' || typeof r.lessons !== 'object') throw new Error('invalid');
  return {
    ...d,
    ...r,
    streak: { ...d.streak, ...(r.streak || {}) },
    settings: { ...d.settings, ...(r.settings || {}) },
    version: 1,
  } as Progress;
}

function load(): Progress {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return sanitize(JSON.parse(s));
  } catch {
    /* ignore corrupted storage */
  }
  return defaultProgress();
}

let state: Progress = load();
const listeners = new Set<() => void>();

function applySettings() {
  setSpeechRate(state.settings.rate);
  setSfxEnabled(state.settings.sound);
}
applySettings();

function set(next: Progress) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / private mode */
  }
  applySettings();
  listeners.forEach((l) => l());
}

export const getProgress = () => state;
export const updateProgress = (fn: (p: Progress) => Progress) => set(fn(state));

export function useProgress() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
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
  if (state.gems < n) return false;
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

export function noteCombo(combo: number) {
  if (combo > state.bestCombo) updateProgress((p) => ({ ...p, bestCombo: combo }));
}

/** Unlock new achievements, award their gems, return the newly unlocked ones. */
export function checkAchievements(): Achievement[] {
  const fresh = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.check(state));
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
