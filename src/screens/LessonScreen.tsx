import { useCallback, useMemo, useRef, useState } from 'react';
import type { Word } from '../types';
import { LESSON_BY_ID } from '../data';
import {
  buildLesson,
  buildReview,
  exerciseWords,
  makeExercise,
  makeRetry,
  type Exercise,
} from '../lib/exercises';
import {
  comboBonus,
  difficulty as calcDifficulty,
  DIFFICULTY_LABEL,
  HEART_REFILL_COST,
  LESSON_BONUS_XP,
  MAX_HEARTS,
  PERFECT_BONUS_XP,
  XP_PER_CORRECT,
  type Achievement,
} from '../lib/gamification';
import {
  addGems,
  addXp,
  checkAchievements,
  completeLesson,
  getProgress,
  noteCombo,
  recordAnswer,
  spendGems,
  updateProgress,
  useProgress,
} from '../lib/store';
import { recognitionSupported } from '../lib/speech';
import { weakestWords } from '../lib/srs';
import { sfx } from '../lib/sound';
import ProgressBar from '../components/ProgressBar';
import Panda from '../components/Panda';
import { BadgeGlyph, Bolt, Close, Flame, Gem, Heart, Check } from '../components/Icons';
import type { CheckResult } from '../exercises/types';
import { ArrangeEx, CharEx, IntroCard, ListenEx, MatchEx, MeaningEx, SpeakEx, TypeEx } from '../exercises/Exercises';

export type SessionMode = { type: 'lesson'; lessonId: string } | { type: 'review' };

interface Summary {
  xp: number;
  accuracy: number;
  maxCombo: number;
  gems: number;
  streakExtended: boolean;
  goalReached: boolean;
  achievements: Achievement[];
  missed: Word[];
}

function buildQueue(mode: SessionMode, pool: Word[]): Exercise[] {
  const p = getProgress();
  const d = calcDifficulty(p.recent, 0, 0);
  const speaking = p.settings.speaking && recognitionSupported();
  if (mode.type === 'review') return buildReview(pool, { difficulty: d, speaking: false });
  const newIds = new Set(pool.filter((w) => !p.words[w.id]).map((w) => w.id));
  return buildLesson(pool, { difficulty: d, newWordIds: newIds, speaking });
}

export default function LessonScreen({ mode, onExit }: { mode: SessionMode; onExit: () => void }) {
  const progress = useProgress();
  const pool = useMemo<Word[]>(
    () => (mode.type === 'lesson' ? LESSON_BY_ID[mode.lessonId].words : weakestWords(getProgress(), 10)),
    [mode],
  );
  const [queue, setQueue] = useState<Exercise[]>(() => buildQueue(mode, pool));
  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [graded, setGraded] = useState(0);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<Word[]>([]);
  const [feedback, setFeedback] = useState<(CheckResult & { gain: number }) | null>(null);
  const [phase, setPhase] = useState<'play' | 'failed' | 'done'>('play');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [checkFn, setCheckFnState] = useState<(() => CheckResult) | null>(null);
  const checkRef = useRef<(() => CheckResult) | null>(null);

  const setCheck = useCallback((fn: (() => CheckResult) | null) => {
    checkRef.current = fn;
    setCheckFnState(() => fn);
  }, []);

  const ex = queue[idx];
  const diff = calcDifficulty(progress.recent, combo, wrongStreak);
  const title = mode.type === 'lesson' ? LESSON_BY_ID[mode.lessonId].title : 'Ôn tập từ yếu';

  const reset = () => {
    setQueue(buildQueue(mode, pool));
    setIdx(0);
    setHearts(MAX_HEARTS);
    setCombo(0);
    setMaxCombo(0);
    setWrongStreak(0);
    setXp(0);
    setGraded(0);
    setRight(0);
    setMissed([]);
    setFeedback(null);
    setPhase('play');
    setCheck(null);
  };

  const applyResult = (r: CheckResult, current: Exercise) => {
    const words = r.missed ?? exerciseWords(current);
    setGraded((g) => g + 1);
    if (r.correct) {
      const c = combo + 1;
      const gain = XP_PER_CORRECT + comboBonus(c);
      if (current.kind !== 'match') recordAnswer(words.map((w) => w.id), true);
      setCombo(c);
      setMaxCombo((m) => Math.max(m, c));
      setWrongStreak(0);
      setXp((x) => x + gain);
      setRight((n) => n + 1);
      sfx.correct();
      setFeedback({ ...r, gain });
    } else {
      if (current.kind === 'match') {
        // hearts were already taken for each wrong pair
        setFeedback({ ...r, correct: true, gain: 0, note: 'Đã ghép xong! Các cặp ghép sai sẽ được ôn lại.' });
        return;
      }
      recordAnswer(words.map((w) => w.id), false);
      loseHeart(words, current);
      setFeedback({ ...r, gain: 0 });
    }
  };

  const loseHeart = (words: Word[], current: Exercise) => {
    sfx.wrong();
    setCombo(0);
    setWrongStreak((s) => s + 1);
    setHearts((h) => h - 1);
    setMissed((m) => [...m, ...words.filter((w) => !m.some((x) => x.id === w.id))]);
    const d = calcDifficulty(getProgress().recent, 0, wrongStreak + 1);
    setQueue((q) => [...q, ...makeRetry(current, words, pool, d)]);
  };

  const onCheck = () => {
    const fn = checkRef.current;
    if (!fn || !ex) return;
    applyResult(fn(), ex);
  };

  const finish = () => {
    const accuracy = graded ? right / graded : 1;
    const perfect = missed.length === 0;
    const total = xp + LESSON_BONUS_XP + (perfect ? PERFECT_BONUS_XP : 0);
    const gems = mode.type === 'lesson' ? 5 + (perfect ? 5 : 0) : 3;
    const { streakExtended, goalReached } = addXp(total);
    addGems(gems);
    if (mode.type === 'lesson') completeLesson(mode.lessonId, perfect ? 1 : accuracy);
    else updateProgress((p) => ({ ...p, reviews: p.reviews + 1 }));
    noteCombo(maxCombo);
    const achievements = checkAchievements();
    sfx.complete();
    setSummary({ xp: total, accuracy, maxCombo, gems, streakExtended, goalReached, achievements, missed });
    setPhase('done');
  };

  const next = () => {
    setFeedback(null);
    setCheck(null);
    if (hearts <= 0) {
      setPhase('failed');
      return;
    }
    if (idx + 1 >= queue.length) {
      finish();
      return;
    }
    // Adaptive: after repeated mistakes swap the next typing exercise for an easier listening one.
    const upcoming = queue[idx + 1];
    if (diff === 'easy' && upcoming.kind === 'type') {
      const easier = makeExercise('listen', upcoming.word, pool, 'easy');
      setQueue((q) => q.map((e, i) => (i === idx + 1 ? easier : e)));
    }
    setIdx(idx + 1);
  };

  const skip = () => {
    setCheck(null);
    if (idx + 1 >= queue.length) finish();
    else setIdx(idx + 1);
  };

  if (phase === 'done' && summary) return <ResultView s={summary} mode={mode} onDone={onExit} />;

  if (phase === 'failed')
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <Panda size={150} mood="sad" />
        <h1 className="text-2xl font-black text-ink-700">Hết tim rồi!</h1>
        <p className="font-semibold text-ink-500">
          Đừng buồn nhé! Những từ bạn trả lời sai đã được thêm vào mục <b>Ôn tập</b>.
        </p>
        {missed.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {missed.map((w) => (
              <span key={w.id} className="rounded-xl bg-coral-100 px-3 py-1 font-han text-lg text-coral-600">
                {w.hanzi} <span className="font-sans text-xs font-bold">{w.pinyin}</span>
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex w-full flex-col gap-3">
          <button
            type="button"
            className={progress.gems >= HEART_REFILL_COST ? 'btn-blue' : 'btn-disabled'}
            disabled={progress.gems < HEART_REFILL_COST}
            onClick={() => {
              if (spendGems(HEART_REFILL_COST)) {
                setHearts(MAX_HEARTS);
                setPhase('play');
                if (idx + 1 >= queue.length) finish();
                else setIdx(idx + 1);
              }
            }}
          >
            <Heart size={22} className="mr-2" /> Hồi đầy tim · <Gem size={20} className="mx-1" /> {HEART_REFILL_COST}
          </button>
          <button type="button" className="btn-green" onClick={reset}>
            Làm lại bài
          </button>
          <button type="button" className="btn-white" onClick={onExit}>
            Thoát
          </button>
        </div>
      </div>
    );

  if (!ex) return null;
  const pct = (idx + (feedback ? 1 : 0)) / queue.length;
  const isIntro = ex.kind === 'intro';
  const isMatch = ex.kind === 'match';
  const isSpeak = ex.kind === 'speak';
  const props = { difficulty: diff, locked: !!feedback, setCheck, submit: onCheck };

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col">
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <button type="button" aria-label="Thoát bài học" className="text-ink-300 hover:text-ink-500" onClick={() => setConfirmExit(true)}>
          <Close size={28} />
        </button>
        <ProgressBar value={pct} className="flex-1" />
        <span className="flex items-center gap-1 font-extrabold text-coral-500" data-testid="hearts" aria-label={`${hearts} tim`}>
          <Heart size={26} /> {hearts}
        </span>
      </div>
      <div className="flex h-7 items-center justify-between px-4 text-xs font-extrabold">
        <span className="truncate text-ink-400">{title}</span>
        <span className="flex items-center gap-2">
          {combo >= 2 && (
            <span className="flex animate-pop items-center gap-0.5 rounded-full bg-[#fff0d9] px-2 py-0.5 text-[#ff9600]" data-testid="combo">
              <Flame size={14} /> Combo x{combo}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-sun-600" data-testid="session-xp">
            <Bolt size={14} /> {xp} XP
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              diff === 'easy' ? 'bg-leaf-50 text-leaf-600' : diff === 'hard' ? 'bg-coral-100 text-coral-600' : 'bg-sky-500/10 text-sky-600'
            }`}
            title="Độ khó tự điều chỉnh"
          >
            {DIFFICULTY_LABEL[diff]}
          </span>
        </span>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-4 pt-3" key={ex.id}>
        {ex.kind === 'intro' && <IntroCard ex={ex} />}
        {ex.kind === 'listen' && <ListenEx ex={ex} {...props} />}
        {ex.kind === 'meaning' && <MeaningEx ex={ex} {...props} />}
        {ex.kind === 'char' && <CharEx ex={ex} {...props} />}
        {ex.kind === 'type' && <TypeEx ex={ex} {...props} />}
        {ex.kind === 'arrange' && <ArrangeEx ex={ex} {...props} />}
        {ex.kind === 'speak' && <SpeakEx ex={ex} {...props} />}
        {ex.kind === 'match' && (
          <MatchEx
            ex={ex}
            locked={!!feedback}
            onWrongPair={(ws) => {
              recordAnswer(ws.map((w) => w.id), false);
              loseHeart([ws[0]], { ...ex, words: [ws[0]] });
              if (hearts - 1 <= 0) setFeedback({ correct: false, gain: 0, solution: `${ws[0].hanzi} = ${ws[0].vi}`, solutionSub: ws[0].pinyin });
            }}
            onDone={(mist) => {
              const ok = ex.words.filter((w) => !mist.some((m) => m.id === w.id));
              recordAnswer(ok.map((w) => w.id), true);
              applyResult({ correct: mist.length === 0, missed: mist, solution: 'Đã ghép xong tất cả các cặp' }, ex);
            }}
          />
        )}
      </main>

      <FeedbackBar
        feedback={feedback}
        canCheck={!!checkFn}
        isIntro={isIntro}
        isMatch={isMatch}
        isSpeak={isSpeak}
        onCheck={onCheck}
        onNext={next}
        onSkip={skip}
      />

      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setConfirmExit(false)}>
          <div className="w-full max-w-md animate-slideUp rounded-t-3xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <Panda size={90} mood="sad" className="mx-auto" />
            <h3 className="mt-2 text-xl font-black">Bạn muốn thoát?</h3>
            <p className="mb-5 font-semibold text-ink-500">Tiến độ của bài học này sẽ không được lưu.</p>
            <div className="flex flex-col gap-3">
              <button type="button" className="btn-blue" onClick={() => setConfirmExit(false)}>
                Học tiếp
              </button>
              <button type="button" className="btn-white !text-coral-500" onClick={onExit}>
                Thoát bài học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackBar({
  feedback,
  canCheck,
  isIntro,
  isMatch,
  isSpeak,
  onCheck,
  onNext,
  onSkip,
}: {
  feedback: (CheckResult & { gain: number }) | null;
  canCheck: boolean;
  isIntro: boolean;
  isMatch: boolean;
  isSpeak: boolean;
  onCheck: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  if (feedback) {
    const ok = feedback.correct;
    return (
      <div className={`animate-slideUp px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 ${ok ? 'bg-leaf-100' : 'bg-coral-100'}`} role="status">
        <div className="mb-3 flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ${ok ? 'text-leaf-500' : 'text-coral-500'}`}>
            {ok ? <Check size={26} /> : <Close size={24} />}
          </span>
          <div className="min-w-0">
            <div className={`text-xl font-black ${ok ? 'text-leaf-700' : 'text-coral-600'}`}>
              {ok ? (feedback.note ? 'Gần hoàn hảo!' : 'Chính xác!') : 'Chưa đúng rồi'}
              {ok && feedback.gain > 0 && <span className="ml-2 text-base text-sun-600">+{feedback.gain} XP</span>}
            </div>
            {feedback.note && <div className="text-sm font-bold text-leaf-700">{feedback.note}</div>}
            {!ok && feedback.solution && (
              <div className="text-coral-600">
                <div className="text-sm font-extrabold">Đáp án đúng:</div>
                <div className="font-han text-lg font-bold">{feedback.solution}</div>
                {feedback.solutionSub && <div className="text-sm font-bold">{feedback.solutionSub}</div>}
              </div>
            )}
          </div>
        </div>
        <button type="button" className={ok ? 'btn-green' : 'btn-red'} onClick={onNext} autoFocus>
          Tiếp tục
        </button>
      </div>
    );
  }
  if (isMatch) return <div className="h-6" />;
  return (
    <div className="flex gap-3 border-t-2 border-cloud px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      {isSpeak && (
        <button type="button" className="btn-white !w-auto !text-ink-400" onClick={onSkip}>
          Bỏ qua
        </button>
      )}
      {isIntro ? (
        <button type="button" className="btn-green" onClick={onSkip}>
          Tiếp tục
        </button>
      ) : (
        <button type="button" className={canCheck ? 'btn-green' : 'btn-disabled'} disabled={!canCheck} onClick={onCheck}>
          Kiểm tra
        </button>
      )}
    </div>
  );
}

function ResultView({ s, mode, onDone }: { s: Summary; mode: SessionMode; onDone: () => void }) {
  const p = useProgress();
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center px-6 pb-8 pt-10 text-center">
      <Panda size={150} mood="cheer" className="animate-bounceSoft" />
      <h1 className="mt-2 text-3xl font-black text-sun-600">{mode.type === 'lesson' ? 'Hoàn thành bài học!' : 'Ôn tập xong!'}</h1>
      <p className="font-bold text-ink-500">{s.missed.length === 0 ? 'Hoàn hảo, không sai câu nào!' : 'Làm tốt lắm, tiếp tục cố gắng nhé!'}</p>
      <div className="mt-6 grid w-full grid-cols-3 gap-3">
        <Stat label="Tổng XP" value={`+${s.xp}`} color="bg-sun-500" icon={<Bolt size={18} />} />
        <Stat label="Chính xác" value={`${Math.round(s.accuracy * 100)}%`} color="bg-leaf-500" icon={<Check size={18} />} />
        <Stat label="Combo" value={`x${s.maxCombo}`} color="bg-[#ff9600]" icon={<Flame size={18} />} />
      </div>
      <div className="mt-4 flex w-full flex-col gap-2 text-left">
        <Banner>
          <Gem size={22} /> Nhận được <b className="text-sky-600">{s.gems} đá quý</b>
        </Banner>
        {s.streakExtended && (
          <Banner>
            <Flame size={22} /> Chuỗi học tập: <b className="text-[#ff9600]">{p.streak.current} ngày</b>!
          </Banner>
        )}
        {s.goalReached && (
          <Banner>
            <Bolt size={22} /> Đạt mục tiêu hôm nay! <b className="text-sky-600">+10 đá quý</b>
          </Banner>
        )}
        {s.achievements.map((a) => (
          <Banner key={a.id}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-grape-500">
              <BadgeGlyph name={a.icon} size={18} />
            </span>
            Huy hiệu mới: <b>{a.title}</b> (+{a.gems} đá quý)
          </Banner>
        ))}
        {s.missed.length > 0 && (
          <div className="card">
            <div className="mb-2 text-sm font-extrabold text-ink-500">Từ cần ôn lại (đã thêm vào Ôn tập):</div>
            <div className="flex flex-wrap gap-2">
              {s.missed.map((w) => (
                <span key={w.id} className="rounded-xl bg-coral-100 px-2 py-1 font-han text-coral-600">
                  {w.hanzi} <span className="font-sans text-xs font-bold">{w.pinyin}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-auto w-full pt-6">
        <button type="button" className="btn-green" onClick={onDone}>
          Tiếp tục
        </button>
      </div>
    </div>
  );
}

const Stat = ({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) => (
  <div className={`overflow-hidden rounded-2xl border-2 ${color.replace('bg-', 'border-')}`}>
    <div className={`${color} py-1 text-xs font-extrabold uppercase text-white`}>{label}</div>
    <div className="flex items-center justify-center gap-1 py-3 text-xl font-black text-ink-700">
      {icon}
      {value}
    </div>
  </div>
);

const Banner = ({ children }: { children: React.ReactNode }) => (
  <div className="flex animate-pop items-center gap-2 rounded-2xl border-2 border-cloud px-4 py-3 font-bold text-ink-700">{children}</div>
);
