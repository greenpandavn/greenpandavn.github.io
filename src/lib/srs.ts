import type { Progress, WordProgress, WordStatus, Word } from '../types';
import { ALL_WORDS, knownWord, wordTotal } from '../data';

const HOUR = 3600_000;
// Review interval for each strength level (0..5)
const INTERVALS = [0, 4 * HOUR, 24 * HOUR, 72 * HOUR, 7 * 24 * HOUR, 14 * 24 * HOUR];

export function updateWord(wp: WordProgress | undefined, correct: boolean, now = Date.now()): WordProgress {
  const base: WordProgress = wp ?? { strength: 0, correct: 0, wrong: 0, lastSeen: 0, due: 0, lastWrong: 0 };
  const strength = correct ? Math.min(5, base.strength + 1) : Math.max(0, base.strength - 2);
  return {
    strength,
    correct: base.correct + (correct ? 1 : 0),
    wrong: base.wrong + (correct ? 0 : 1),
    lastSeen: now,
    lastWrong: correct ? base.lastWrong : now,
    due: now + INTERVALS[strength],
  };
}

export function wordStatus(wp: WordProgress | undefined): WordStatus {
  if (!wp) return 'new';
  if (wp.strength >= 4 && wp.correct >= 3) return 'mastered';
  return 'learning';
}

export const STATUS_LABEL: Record<WordStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  mastered: 'Đã thuộc',
};

/** Lower score = weaker word = should be reviewed first. */
function weakness(wp: WordProgress, now: number) {
  let score = wp.strength * 10;
  if (wp.lastWrong && wp.lastWrong >= wp.lastSeen - 1000) score -= 25; // most recent answer was wrong
  score -= Math.min(20, wp.wrong * 4);
  if (wp.due <= now) score -= 10;
  return score;
}

export function weakestWords(p: Progress, limit = 10, now = Date.now()): Word[] {
  return ALL_WORDS.filter((w) => p.words[w.id])
    .map((w) => ({ w, s: weakness(p.words[w.id], now) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.w);
}

export function countByStatus(p: Progress) {
  const out = { new: 0, learning: 0, mastered: 0 };
  // counted from the progress itself, so that it does not depend on which parts are downloaded
  for (const id in p.words) if (knownWord(id)) out[wordStatus(p.words[id])]++;
  out.new = Math.max(0, wordTotal() - out.learning - out.mastered);
  return out;
}

export function dueCount(p: Progress, now = Date.now()) {
  return Object.values(p.words).filter((w) => w.due <= now || w.strength < 2).length;
}
