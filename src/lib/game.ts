import type { CourseId, Word } from "../types";
import { CONCEPTS, alike, conceptOf } from "./gameArt";
import { EMOJI } from "./gameEmoji";

export const GAME_QUESTIONS = 10;
export const GAME_SECONDS = 60;
export const GAME_XP = 10;
export const GAME_FEEDBACK_MS = 900;
const MAX_DRAWN = 7;

/** 'art' = one of the app's own drawings (the clue is its concept name), 'emoji' = a pictorial emoji. */
export type ClueKind = "art" | "emoji" | "pinyin" | "vi";
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
  return kind === "art"
    ? conceptOf(w.hanzi)
    : kind === "emoji"
      ? emojiOf(w)
      : kind === "pinyin"
        ? w.pinyin
        : w.vi;
}

/** Two words that would make a "wrong" pairing ambiguous: same spelling, reading, meaning or picture. */
function same(a: Word, b: Word, kind: ClueKind) {
  return (
    norm(a.hanzi) === norm(b.hanzi) ||
    norm(a.vi) === norm(b.vi) ||
    (!!a.pinyin && norm(a.pinyin) === norm(b.pinyin)) ||
    norm(clue(a, kind) ?? "") === norm(clue(b, kind) ?? "") ||
    (kind === "art" && alike(conceptOf(a.hanzi)!, conceptOf(b.hanzi)!))
  );
}

/**
 * One round: up to 10 different words from `prefer` (topped up from `level` when there are too few),
 * half of them shown with their own clue and half with the clue of another word of the level.
 */
export function buildRound(
  course: CourseId,
  prefer: Word[],
  level: Word[],
  rnd: () => number = Math.random,
): GameQuestion[] {
  const seen = new Set<string>();
  const unique = (list: Word[]) =>
    list.filter((w) => {
      const k = norm(w.hanzi);
      if (!k || !w.vi || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const first = shuffle(unique(prefer), rnd);
  const list =
    first.length >= GAME_QUESTIONS
      ? first
      : [...first, ...shuffle(unique(level), rnd)];
  // words with a drawing go first (at most 7 of the 10), so that a round has pictures whenever the level offers them
  // the drawings are keyed by Chinese and English words only
  const pictures = course === "zh" || course === "en";
  const drawn = list.filter((w) => pictures && conceptOf(w.hanzi)).slice(0, MAX_DRAWN);
  const words = shuffle(
    [...drawn, ...list.filter((w) => !drawn.includes(w))].slice(
      0,
      GAME_QUESTIONS,
    ),
    rnd,
  );
  const pool = [...prefer, ...level];
  const matches = shuffle(
    words.map((_, i) => i < Math.ceil(words.length / 2)),
    rnd,
  );
  return words.map((word, i) => {
    const art = pictures && !!conceptOf(word.hanzi);
    // English: drawing, else pictorial emoji, else meaning. Chinese: the drawing when there is one, else pinyin or meaning.
    const text: ClueKind = word.pinyin && rnd() < 0.5 ? "pinyin" : "vi";
    const kind: ClueKind =
      course === "en"
        ? art
          ? "art"
          : emojiOf(word)
            ? "emoji"
            : "vi"
        : art
          ? "art"
          : text;
    const truth = clue(word, kind)!;
    const usable = (o: Word) => clue(o, kind) && !same(word, o, kind);
    // a wrong picture comes from another word of the level, or from any other drawing when the level has too few
    const other = matches[i] ? undefined : shuffle(pool, rnd).find(usable);
    if (!matches[i] && !other && kind === "art") {
      const spare = shuffle(CONCEPTS, rnd).find((c) => !alike(c, truth));
      if (spare) return { word, kind, truth, shown: spare, match: false };
    }
    // no usable other word (tiny level): fall back to a correct pairing rather than risk a wrong "wrong"
    return {
      word,
      kind,
      truth,
      shown: other ? clue(other, kind)! : truth,
      match: !other,
    };
  });
}

const BEST_KEY = "gp-game-tf-best";
export function bestScore(course: CourseId): number {
  try {
    return (
      Number(JSON.parse(localStorage.getItem(BEST_KEY) || "{}")[course]) || 0
    );
  } catch {
    return 0;
  }
}
export function saveBest(course: CourseId, score: number) {
  const best = Math.max(score, bestScore(course));
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
    localStorage.setItem(BEST_KEY, JSON.stringify({ ...all, [course]: best }));
  } catch {
    /* private mode */
  }
  return best;
}
