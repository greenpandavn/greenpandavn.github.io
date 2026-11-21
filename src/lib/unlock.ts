import { CORE_LESSONS, UNITS } from '../data';
import type { Lesson, Progress, StartLevel } from '../types';
import { updateProgress } from './store';

export const setLevel = (level: StartLevel) => updateProgress((p) => ({ ...p, settings: { ...p.settings, level } }));

export const LEVELS: { id: StartLevel; title: string; desc: string }[] = [
  { id: 'new', title: 'Chưa biết gì', desc: 'Bắt đầu từ bài 1, mở khóa từng bài một.' },
  { id: 'some', title: 'Biết sơ sơ', desc: 'Mở khóa toàn bộ Phần 1, bắt đầu từ Phần 2.' },
  { id: 'done', title: 'Đã học rồi', desc: 'Mở khóa tất cả bài học, tự chọn bài muốn học.' },
];

/** Highest unit that is opened for free by the self-selected level. */
function freeUnit(p: Progress) {
  if (p.settings.level === 'done') return Infinity;
  if (p.settings.level === 'some') return UNITS[0]?.unit ?? 1;
  return -Infinity;
}

export const isDone = (p: Progress, l: Lesson) => (p.lessons[l.id]?.completed ?? 0) > 0;

export function isUnlocked(p: Progress, l: Lesson) {
  if (l.bonus) return p.unlockedBonus.includes(l.id);
  const free = freeUnit(p);
  if (l.unit <= free) return true;
  const i = CORE_LESSONS.findIndex((c) => c.id === l.id);
  if (i <= 0) return true;
  const prev = CORE_LESSONS[i - 1];
  return prev.unit <= free || isDone(p, prev);
}

export function isTestUnlocked(p: Progress, unit: number) {
  return unit <= freeUnit(p) || CORE_LESSONS.filter((l) => l.unit === unit).every((l) => isDone(p, l));
}

/** The lesson the learner should do next ("Bắt đầu" marker). */
export function currentLessonId(p: Progress) {
  const free = freeUnit(p);
  const open = CORE_LESSONS.filter((l) => !isDone(p, l) && isUnlocked(p, l));
  return (open.find((l) => l.unit > free) ?? open[0])?.id;
}
