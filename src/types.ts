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
  order?: number;
  title: string;
  desc: string;
  icon: string;
  unit: number;
  words: Word[];
  bonus?: boolean;
  course?: CourseId;
  cost?: number;
}

export type CourseId = 'zh' | 'en';

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
  name: string; // display name (guest) – mirrors the account name when logged in
  reminderOn: boolean;
  reminderTime: string; // HH:mm
  level: StartLevel | ''; // '' = not chosen yet (first launch)
  theme: ThemeId;
  dark: boolean;
}

export type StartLevel = 'new' | 'some' | 'done';
export type ThemeId = 'leaf' | 'ocean' | 'grape' | 'sakura' | 'sunset';

export interface Certificate {
  id: string;
  unit: number;
  part: string;
  name: string;
  score: number; // 0..100
  correct: number;
  total: number;
  date: string; // yyyy-mm-dd
}

export interface TestResult {
  unit: number;
  correct: number;
  total: number;
  passed: boolean;
  date: string;
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
  certificates: Certificate[];
  tests: TestResult[];
  lessonStats: Record<string, { fails: number }>; // failed attempts (hearts ran out) per lesson
  settings: Settings;
  /** English-course progress. The top-level fields above always hold the Chinese course when stored. */
  en?: CourseProgress;
}

/** The part of the progress that is tracked separately for each course. */
export type CourseProgress = Pick<
  Progress,
  | 'xp'
  | 'lessons'
  | 'unlockedBonus'
  | 'words'
  | 'streak'
  | 'days'
  | 'achievements'
  | 'recent'
  | 'reviews'
  | 'perfectLessons'
  | 'bestCombo'
  | 'goalBonusDates'
  | 'certificates'
  | 'tests'
  | 'lessonStats'
> & { level: StartLevel | '' };
