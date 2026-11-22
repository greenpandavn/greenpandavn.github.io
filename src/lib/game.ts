import type { CourseId, Word } from '../types';
import { EMOJI } from './gameEmoji';

export const GAME_QUESTIONS = 10;
export const GAME_SECONDS = 60;
export const GAME_XP = 10;
export const GAME_FEEDBACK_MS = 900;

export type ClueKind = 'emoji' | 'pinyin' | 'vi';
export interface GameQuestion {
  word: Word;
  kind: ClueKind;
  /** What is shown next to the word. */
  shown: string;
  /** The clue that really belongs to the word. */
  truth: string;
  match: boolean;
}

const norm = (s: string) => s.trim().toLowerCase();
export const emojiOf = (w: Word) => EMOJI[norm(w.hanzi)];

function shuffle<T>(list: T[], rnd: () => number) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clue(w: Word, kind: ClueKind) {
  return kind === 'emoji' ? emojiOf(w) : kind === 'pinyin' ? w.pinyin : w.vi;
}

/** Two words that would make a "wrong" pairing ambiguous: same spelling, reading, meaning or picture. */
function same(a: Word, b: Word, kind: ClueKind) {
  return (
    norm(a.hanzi) === norm(b.hanzi) ||
    norm(a.vi) === norm(b.vi) ||
    (!!a.pinyin && norm(a.pinyin) === norm(b.pinyin)) ||
    norm(clue(a, kind) ?? '') === norm(clue(b, kind) ?? '')
  );
}

/**
 * One round: up to 10 different words from `prefer` (topped up from `level` when there are too few),
 * half of them shown with their own clue and half with the clue of another word of the level.
 */
export function buildRound(course: CourseId, prefer: Word[], level: Word[], rnd: () => number = Math.random): GameQuestion[] {
  const seen = new Set<string>();
  const unique = (list: Word[]) =>
    list.filter((w) => {
      const k = norm(w.hanzi);
      if (!k || !w.vi || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const first = shuffle(unique(prefer), rnd);
  const words = (first.length >= GAME_QUESTIONS ? first : [...first, ...shuffle(unique(level), rnd)]).slice(0, GAME_QUESTIONS);
  const pool = [...prefer, ...level];
  const matches = shuffle(
    words.map((_, i) => i < Math.ceil(words.length / 2)),
    rnd,
  );
  return words.map((word, i) => {
    const kind: ClueKind = course === 'en' ? (emojiOf(word) ? 'emoji' : 'vi') : word.pinyin && rnd() < 0.5 ? 'pinyin' : 'vi';
    const truth = clue(word, kind)!;
    const other = matches[i] ? undefined : shuffle(pool, rnd).find((o) => clue(o, kind) && !same(word, o, kind));
    // no usable other word (tiny level): fall back to a correct pairing rather than risk a wrong "wrong"
    return { word, kind, truth, shown: other ? clue(other, kind)! : truth, match: !other };
  });
}

const BEST_KEY = 'gp-game-tf-best';
export function bestScore(course: CourseId): number {
  try {
    return Number(JSON.parse(localStorage.getItem(BEST_KEY) || '{}')[course]) || 0;
  } catch {
    return 0;
  }
}
export function saveBest(course: CourseId, score: number) {
  const best = Math.max(score, bestScore(course));
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
    localStorage.setItem(BEST_KEY, JSON.stringify({ ...all, [course]: best }));
  } catch {
    /* private mode */
  }
  return best;
}
