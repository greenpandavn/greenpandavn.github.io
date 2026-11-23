import type { Certificate, CourseId, Progress, SubCourseId, TestResult, WordProgress } from '../types';

export const SUB_COURSES: SubCourseId[] = ['en', 'ko', 'ja'];
import { coursePart, courseView } from './store';

const maxBy = <T>(a: T | undefined, b: T | undefined, score: (x: T) => number): T | undefined => {
  if (!a) return b;
  if (!b) return a;
  return score(b) > score(a) ? b : a;
};

const laterDate = (a: string | null, b: string | null) => (!a ? b : !b ? a : a >= b ? a : b);

function mergeStats(a: Progress['lessonStats'] = {}, b: Progress['lessonStats'] = {}) {
  const out: Progress['lessonStats'] = { ...b };
  for (const [id, v] of Object.entries(a)) out[id] = { fails: Math.max(v.fails, out[id]?.fails ?? 0) };
  return out;
}

export function hasProgress(p: Progress | null | undefined): boolean {
  for (const c of SUB_COURSES) if (p?.[c] && hasProgress(courseView(p, c))) return true;
  if (p?.mock && Object.keys(p.mock).length) return true;
  return !!p && (p.xp > 0 || Object.keys(p.lessons).length > 0 || Object.keys(p.words).length > 0 || p.certificates.length > 0);
}

/**
 * Merge two progress snapshots without losing anything: keeps the higher XP / gems / streak,
 * union of lessons, achievements, certificates, and the most recently practised state per word.
 * `primary` wins for settings (cloud data when logging in).
 */
export function mergeProgress(primary: Progress, other: Progress): Progress {
  const merged = mergeFlat(primary, other);
  // the other courses are merged with the same rules as the Chinese one
  const sub = Object.fromEntries(
    SUB_COURSES.map((c) => [
      c,
      primary[c] && other[c] ? coursePart(mergeFlat(courseView(primary, c), courseView(other, c))) : (primary[c] ?? other[c]),
    ]),
  ) as Pick<Progress, SubCourseId>;
  const mock: NonNullable<Progress['mock']> = { ...other.mock };
  for (const [lv, a] of Object.entries(primary.mock ?? {})) {
    const b = mock[lv];
    mock[lv] = !b ? a : { ...(a.best >= b.best ? a : b), attempts: Math.max(a.attempts, b.attempts) };
  }
  return { ...merged, gems: Math.max(primary.gems, other.gems), ...sub, mock: Object.keys(mock).length ? mock : undefined };
}

function mergeFlat(primary: Progress, other: Progress): Progress {
  const lessons: Progress['lessons'] = { ...other.lessons };
  for (const [id, lp] of Object.entries(primary.lessons)) {
    const o = lessons[id];
    lessons[id] = o
      ? { completed: Math.max(lp.completed, o.completed), bestAccuracy: Math.max(lp.bestAccuracy, o.bestAccuracy) }
      : lp;
  }

  const words: Record<string, WordProgress> = { ...other.words };
  for (const [id, wp] of Object.entries(primary.words)) {
    words[id] = maxBy(wp, words[id], (w) => w.lastSeen * 10 + w.strength)!;
  }

  const days: Record<string, number> = { ...other.days };
  for (const [d, xp] of Object.entries(primary.days)) days[d] = Math.max(xp, days[d] ?? 0);

  const achievements: Record<string, string> = { ...other.achievements };
  for (const [id, d] of Object.entries(primary.achievements)) achievements[id] = achievements[id] && achievements[id] < d ? achievements[id] : d;

  const lastDate = laterDate(primary.streak.lastDate, other.streak.lastDate);
  const streak = {
    current: Math.max(primary.streak.current, other.streak.current),
    longest: Math.max(primary.streak.longest, other.streak.longest, primary.streak.current, other.streak.current),
    lastDate,
  };

  const certMap = new Map<string, Certificate>();
  for (const c of [...other.certificates, ...primary.certificates]) {
    const prev = certMap.get(c.id);
    if (!prev || c.score > prev.score) certMap.set(c.id, c);
  }
  const testKey = (t: TestResult) => `${t.unit}|${t.date}|${t.correct}|${t.total}`;
  const tests = [...new Map([...other.tests, ...primary.tests].map((t) => [testKey(t), t])).values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-50);

  return {
    ...primary,
    xp: Math.max(primary.xp, other.xp),
    gems: Math.max(primary.gems, other.gems),
    lessons,
    unlockedBonus: [...new Set([...primary.unlockedBonus, ...other.unlockedBonus])],
    words,
    streak,
    days,
    achievements,
    recent: primary.recent.length >= other.recent.length ? primary.recent : other.recent,
    reviews: Math.max(primary.reviews, other.reviews),
    perfectLessons: Math.max(primary.perfectLessons, other.perfectLessons),
    bestCombo: Math.max(primary.bestCombo, other.bestCombo),
    goalBonusDates: [...new Set([...primary.goalBonusDates, ...other.goalBonusDates])].sort().slice(-60),
    certificates: [...certMap.values()].sort((a, b) => a.unit - b.unit),
    tests,
    settings: {
      ...other.settings,
      ...primary.settings,
      name: primary.settings.name || other.settings.name,
      level: primary.settings.level || other.settings.level,
    },
    lessonStats: mergeStats(primary.lessonStats, other.lessonStats),
  };
}

/**
 * Decide which progress to use right after sign-in.
 * - cloud: progress stored in Firestore (null if new account or unreachable)
 * - cache: this device's offline copy for the account (may hold edits not yet uploaded)
 * - guest: logged-out local progress, migrated into the account only once per uid
 */
export function resolveLogin(opts: {
  cloud: Progress | null;
  cache: Progress | null;
  guest: Progress | null;
  alreadyMigrated: boolean;
  fallback: Progress;
  /** Guest XP already carried into an account earlier (per course); only the rest is added. */
  carried?: Partial<Record<CourseId, number>>;
}): { progress: Progress; migrated: boolean } {
  let p = opts.cloud ?? opts.cache ?? opts.fallback;
  if (opts.cloud && opts.cache) p = mergeProgress(opts.cloud, opts.cache);
  let migrated = false;
  if (!opts.alreadyMigrated && hasProgress(opts.guest)) {
    const base = opts.cloud || opts.cache ? p : null;
    p = mergeProgress(p, opts.guest!);
    if (base) {
      // XP earned while anonymous is added on top of the account's XP (everything else is a union).
      const c = opts.carried ?? {};
      p = { ...p, xp: Math.max(p.xp, base.xp + Math.max(0, opts.guest!.xp - (c.zh ?? 0))) };
      for (const k of SUB_COURSES) {
        const part = p[k];
        if (part) p = { ...p, [k]: { ...part, xp: Math.max(part.xp, (base[k]?.xp ?? 0) + Math.max(0, (opts.guest![k]?.xp ?? 0) - (c[k] ?? 0))) } };
      }
    }
    migrated = true;
  }
  const g = opts.guest?.settings;
  if (g) {
    // Choices made before signing in (level, colours) carry over when the account has none yet.
    const s = { ...p.settings };
    if (!s.level && g.level) s.level = g.level;
    if (!opts.cloud) Object.assign(s, { theme: g.theme, dark: g.dark });
    p = { ...p, settings: s };
  }
  return { progress: p, migrated };
}

/** ISO week id like 2026-W47, computed in local time. */
export function weekId(d = new Date()): string {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (t.getDay() + 6) % 7; // Mon=0
  t.setDate(t.getDate() - day + 3); // Thursday of this week
  const firstThu = new Date(t.getFullYear(), 0, 4);
  const week = 1 + Math.round(((t.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** XP earned during the current (Mon–Sun) week. */
export function weekXp(p: Progress, now = new Date()): number {
  const id = weekId(now);
  return Object.entries(p.days).reduce((sum, [k, xp]) => {
    const [y, m, d] = k.split('-').map(Number);
    return weekId(new Date(y, m - 1, d)) === id ? sum + xp : sum;
  }, 0);
}
