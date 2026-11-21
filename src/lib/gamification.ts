import type { Progress } from '../types';
import { CORE_LESSONS, isEnglish, unitLevel } from '../data';
import { countByStatus } from './srs';
import { dateKey, addDays } from './date';

export const XP_PER_CORRECT = 2;
export const LESSON_BONUS_XP = 5;
export const PERFECT_BONUS_XP = 5;
export const HEART_REFILL_COST = 20;
export const MAX_HEARTS = 3;

/** Extra XP for consecutive correct answers. */
export function comboBonus(combo: number) {
  if (combo >= 10) return 3;
  if (combo >= 6) return 2;
  if (combo >= 3) return 1;
  return 0;
}

/** Level n starts at 25*(n-1)^2 XP: 0, 25, 100, 225, 400, 625, 900, 1225... */
export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 25)) + 1;
  const start = 25 * (level - 1) ** 2;
  const next = 25 * level ** 2;
  return { level, start, next, pct: (xp - start) / (next - start) };
}

export function currentStreak(p: Progress, today = dateKey()) {
  const last = p.streak.lastDate;
  if (!last) return 0;
  if (last === today || last === addDays(today, -1)) return p.streak.current;
  return 0;
}

export const todayXp = (p: Progress) => p.days[dateKey()] ?? 0;

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  gems: number;
  check: (p: Progress) => boolean;
}

const lessonsDone = (p: Progress) => Object.values(p.lessons).filter((l) => l.completed > 0).length;
const coreDone = (p: Progress) => CORE_LESSONS.filter((l) => p.lessons[l.id]?.completed).length;

const BASE_ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'Bước đầu tiên', desc: 'Hoàn thành bài học đầu tiên', icon: 'sprout', gems: 5, check: (p) => lessonsDone(p) >= 1 },
  { id: 'lessons5', title: 'Chăm chỉ', desc: 'Hoàn thành 5 bài học', icon: 'book', gems: 10, check: (p) => lessonsDone(p) >= 5 },
  { id: 'lessons10', title: 'Học giả nhí', desc: 'Hoàn thành 10 bài học', icon: 'cap', gems: 20, check: (p) => lessonsDone(p) >= 10 },
  { id: 'course', title: 'Tốt nghiệp HSK 1', desc: 'Hoàn thành tất cả bài học chính của HSK 1', icon: 'trophy', gems: 50, check: (p) => levelDone(p, 1) },
  { id: 'streak3', title: 'Khởi động', desc: 'Giữ chuỗi 3 ngày', icon: 'flame', gems: 5, check: (p) => p.streak.longest >= 3 },
  { id: 'streak7', title: 'Một tuần rực lửa', desc: 'Giữ chuỗi 7 ngày', icon: 'flame', gems: 20, check: (p) => p.streak.longest >= 7 },
  { id: 'streak30', title: 'Không thể cản phá', desc: 'Giữ chuỗi 30 ngày', icon: 'flame', gems: 100, check: (p) => p.streak.longest >= 30 },
  { id: 'xp100', title: 'Trăm điểm', desc: 'Đạt 100 XP', icon: 'bolt', gems: 5, check: (p) => p.xp >= 100 },
  { id: 'xp500', title: 'Ngôi sao đang lên', desc: 'Đạt 500 XP', icon: 'star', gems: 15, check: (p) => p.xp >= 500 },
  { id: 'xp1000', title: 'Nghìn điểm', desc: 'Đạt 1000 XP', icon: 'crown', gems: 30, check: (p) => p.xp >= 1000 },
  { id: 'perfect', title: 'Hoàn hảo', desc: 'Hoàn thành bài học không sai câu nào', icon: 'target', gems: 10, check: (p) => p.perfectLessons >= 1 },
  { id: 'combo10', title: 'Combo x10', desc: 'Trả lời đúng 10 câu liên tiếp', icon: 'zap', gems: 10, check: (p) => p.bestCombo >= 10 },
  { id: 'master25', title: 'Trí nhớ tốt', desc: 'Thuộc 25 từ', icon: 'brain', gems: 15, check: (p) => countByStatus(p).mastered >= 25 },
  { id: 'master100', title: 'Bộ não siêu việt', desc: 'Thuộc 100 từ', icon: 'brain', gems: 50, check: (p) => countByStatus(p).mastered >= 100 },
  { id: 'review5', title: 'Ôn cũ biết mới', desc: 'Hoàn thành 5 lượt ôn tập', icon: 'refresh', gems: 10, check: (p) => p.reviews >= 5 },
];

const levelDone = (p: Progress, level: number) => {
  const ls = CORE_LESSONS.filter((l) => unitLevel(l.unit) === level);
  return ls.length > 0 && ls.every((l) => p.lessons[l.id]?.completed);
};

/** Badges of the active course. Each course keeps its own set of unlocked badges. */
export function achievements(): Achievement[] {
  if (isEnglish())
    return BASE_ACHIEVEMENTS.map((a) =>
      a.id === 'course'
        ? { ...a, title: 'Tốt nghiệp tiếng Anh cơ bản', desc: 'Hoàn thành tất cả bài học tiếng Anh', check: (p: Progress) => coreDone(p) >= CORE_LESSONS.length }
        : a,
    );
  const i = BASE_ACHIEVEMENTS.findIndex((a) => a.id === 'course') + 1;
  const extra: Achievement[] = [2, 3].map((lv) => ({
    id: `hsk${lv}`,
    title: `Tốt nghiệp HSK ${lv}`,
    desc: `Hoàn thành tất cả bài học của HSK ${lv}`,
    icon: 'trophy',
    gems: 50 * lv,
    check: (p: Progress) => levelDone(p, lv),
  }));
  return [...BASE_ACHIEVEMENTS.slice(0, i), ...extra, ...BASE_ACHIEVEMENTS.slice(i)];
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Dễ', normal: 'Vừa', hard: 'Khó' };

/** Adaptive difficulty from long-term accuracy plus the current lesson's momentum. */
export function difficulty(recent: boolean[], combo: number, wrongStreak: number): Difficulty {
  const last = recent.slice(-12);
  const acc = last.length ? last.filter(Boolean).length / last.length : 0.75;
  let d: Difficulty = 'normal';
  if (last.length >= 6 && acc < 0.6) d = 'easy';
  else if (last.length >= 8 && acc >= 0.9) d = 'hard';
  if (wrongStreak >= 2) d = 'easy';
  else if (combo >= 5) d = d === 'easy' ? 'normal' : 'hard';
  return d;
}
