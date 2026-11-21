export interface Example {
  tokens: string[];
  py: string[];
  vi: string;
  alts: string[];
}

export interface Word {
  id: string;
  hanzi: string;
  pinyin: string;
  vi: string;
  ex: Example;
  lessonId: string;
}

export interface Lesson {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unit: number;
  words: Word[];
  bonus?: boolean;
  cost?: number;
}

export type WordStatus = 'new' | 'learning' | 'mastered';

export interface WordProgress {
  strength: number; // 0..5
  correct: number;
  wrong: number;
  lastSeen: number;
  due: number;
  lastWrong: number;
}

export interface LessonProgress {
  completed: number;
  bestAccuracy: number;
}

export interface Settings {
  sound: boolean;
  rate: number;
  dailyGoal: number;
  speaking: boolean;
}

export interface Progress {
  version: 1;
  xp: number;
  gems: number;
  lessons: Record<string, LessonProgress>;
  unlockedBonus: string[];
  words: Record<string, WordProgress>;
  streak: { current: number; longest: number; lastDate: string | null };
  days: Record<string, number>; // yyyy-mm-dd -> xp earned
  achievements: Record<string, string>; // id -> date unlocked
  recent: boolean[]; // last answers, for adaptive difficulty
  reviews: number;
  perfectLessons: number;
  bestCombo: number;
  goalBonusDates: string[];
  settings: Settings;
}
