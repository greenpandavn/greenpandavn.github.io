import { useEffect, useMemo, useRef, useState } from "react";
import {
  COURSES,
  LESSONS,
  getCourse,
  levelLabel,
  levelUnits,
  setCourse,
  unitLevel,
  useContentVersion,
} from "../data";
import DataGate from "../components/DataGate";
import ProgressBar from "../components/ProgressBar";
import {
  GAME_FEEDBACK_MS,
  GAME_SECONDS,
  GAME_XP,
  bestScore,
  buildRound,
  saveBest,
  type GameQuestion,
} from "../lib/game";
import { ART } from "../lib/gameArt";
import { sfx } from "../lib/sound";
import { addXp, useProgress } from "../lib/store";
import { currentLessonId, isDone } from "../lib/unlock";
import type { Progress } from "../types";

/** The level being studied, and the parts of it whose words the game uses. */
function gameScope(p: Progress) {
  const current =
    LESSONS.find((l) => l.id === currentLessonId(p)) ?? LESSONS[0];
  const level = current ? unitLevel(current.unit) : 1;
  const inLevel = new Set(levelUnits(level));
  const done = LESSONS.filter((l) => inLevel.has(l.unit) && isDone(p, l));
  // finished lessons first; a learner who has not finished any plays with the part they are in
  const units = [
    ...new Set([...done.map((l) => l.unit), current?.unit ?? [...inLevel][0]]),
  ].filter((u) => u !== undefined);
  return { level, units, doneIds: new Set(done.map((l) => l.id)) };
}

export default function GameScreen({ onClose }: { onClose: () => void }) {
  useContentVersion();
  const p = useProgress();
  const course = getCourse();
  const scope = gameScope(p);
  const other = COURSES.find((c) => c.id !== course)!;
  const name = course === "en" ? "Tiếng Anh" : "Tiếng Trung";
  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-6 pt-4"
      data-testid="game-screen"
      data-course={course}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className="chip"
          onClick={onClose}
          aria-label="Đóng trò chơi"
          data-testid="game-close"
        >
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black leading-tight text-ink-700">
            Đúng hay Sai
          </h1>
          <p className="text-xs font-bold text-ink-400" data-testid="game-mode">
            {name} · {levelLabel(scope.level)}
          </p>
        </div>
        <button
          type="button"
          className="chip"
          onClick={() => setCourse(other.id)}
          data-testid="game-switch"
        >
          Chơi {other.id === "en" ? "tiếng Anh" : "tiếng Trung"}
        </button>
      </div>
      <DataGate units={scope.units}>
        <Round
          key={course}
          doneIds={scope.doneIds}
          units={scope.units}
          onSwitch={() => setCourse(other.id)}
        />
      </DataGate>
    </div>
  );
}

function Round({
  doneIds,
  units,
  onSwitch,
}: {
  doneIds: Set<string>;
  units: number[];
  onSwitch: () => void;
}) {
  const course = getCourse();
  const [round, setRound] = useState(0);
  const questions = useMemo(() => {
    const lessons = LESSONS.filter((l) => units.includes(l.unit));
    return buildRound(
      course,
      lessons.filter((l) => doneIds.has(l.id)).flatMap((l) => l.words),
      lessons.flatMap((l) => l.words),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a round keeps its questions; `round` asks for new ones
  }, [round, course]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(GAME_SECONDS * 1000);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [best, setBest] = useState(() => bestScore(course));
  const [record, setRecord] = useState(false);
  const over = index >= questions.length || left <= 0;
  const q: GameQuestion | undefined = questions[index];

  // the clock stops while the feedback of an answer is on screen
  useEffect(() => {
    if (over || answer !== null) return;
    let last = Date.now();
    const t = window.setInterval(() => {
      const now = Date.now();
      const passed = now - last;
      last = now;
      setLeft((ms) => Math.max(0, ms - passed));
    }, 100);
    return () => window.clearInterval(t);
  }, [over, answer]);

  useEffect(() => {
    if (answer === null) return;
    const t = window.setTimeout(() => {
      setAnswer(null);
      setIndex((i) => i + 1);
    }, GAME_FEEDBACK_MS);
    return () => window.clearTimeout(t);
  }, [answer]);

  const saved = useRef(-1);
  useEffect(() => {
    if (!over || saved.current === round) return;
    saved.current = round;
    setRecord(score > bestScore(course));
    setBest(saveBest(course, score));
    if (score > 0) sfx.complete();
  }, [over, round, score, course]);

  const pick = (says: boolean) => {
    if (!q || answer !== null || over) return;
    const right = says === q.match;
    setAnswer(right);
    if (right) {
      setScore((s) => s + 1);
      addXp(GAME_XP);
      sfx.correct();
    } else sfx.wrong();
  };

  const again = () => {
    setIndex(0);
    setScore(0);
    setLeft(GAME_SECONDS * 1000);
    setAnswer(null);
    setRecord(false);
    setRound((r) => r + 1);
  };

  if (!questions.length)
    return (
      <p className="mt-10 text-center font-bold text-ink-400">
        Chưa có từ vựng để chơi. Hãy học một bài trước nhé!
      </p>
    );

  if (over)
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center text-center"
        data-testid="game-end"
      >
        <p className="text-sm font-extrabold uppercase text-ink-400">
          {left <= 0 && index < questions.length ? "Hết giờ!" : "Hoàn thành!"}
        </p>
        <p
          className="mt-2 text-6xl font-black text-leaf-600"
          data-testid="game-score"
        >
          {score}/{questions.length}
        </p>
        <p
          className="mt-3 text-xl font-black text-sun-600"
          data-testid="game-xp"
        >
          +{score * GAME_XP} XP
        </p>
        <p className="mt-2 font-bold text-ink-500" data-testid="game-best">
          Điểm cao nhất: {best}/{questions.length}
          {record && " · Kỷ lục mới!"}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            type="button"
            className="btn-green"
            onClick={again}
            data-testid="game-again"
          >
            Chơi lại
          </button>
          <button
            type="button"
            className="btn-white"
            onClick={onSwitch}
            data-testid="game-end-switch"
          >
            Đổi ngôn ngữ
          </button>
        </div>
      </div>
    );

  const secs = Math.ceil(left / 1000);
  const tone =
    answer === null
      ? "border-cloud bg-white"
      : answer
        ? "border-leaf-500 bg-leaf-100"
        : "border-coral-500 bg-coral-100";
  return (
    <div className="flex flex-1 flex-col" data-testid="game-round">
      <div className="flex items-center gap-3">
        <ProgressBar
          value={left / (GAME_SECONDS * 1000)}
          color={secs <= 10 ? "bg-coral-500" : "bg-sky-500"}
          className="!h-3 flex-1"
        />
        <span
          className={`w-10 text-right font-black tabular-nums ${secs <= 10 ? "text-coral-500" : "text-ink-600"}`}
          data-testid="game-timer"
        >
          {secs}s
        </span>
      </div>
      <div className="mt-2 flex justify-between text-sm font-extrabold text-ink-400">
        <span data-testid="game-progress">
          Câu {index + 1}/{questions.length}
        </span>
        <span className="text-sun-600" data-testid="game-live-xp">
          {score * GAME_XP} XP
        </span>
      </div>
      <div
        className={`mt-4 flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-2 p-5 text-center transition-colors ${tone}`}
        data-testid="game-card"
        data-word={q!.word.id}
        data-kind={q!.kind}
        data-match={q!.match}
      >
        <p
          className={`break-words font-black text-ink-700 ${course === "en" ? "text-4xl" : "font-han text-6xl"}`}
          data-testid="game-word"
        >
          {q!.word.hanzi}
        </p>
        <Clue kind={q!.kind} value={q!.shown} />
        <p
          className="min-h-[3.5rem] text-base font-extrabold"
          data-testid="game-feedback"
          aria-live="polite"
        >
          {answer === true && <span className="text-leaf-600">Đúng rồi!</span>}
          {answer === false && (
            <span className="text-coral-500">
              Sai rồi! {q!.word.hanzi} ={" "}
              {q!.kind === "art" ? (
                <Picture
                  concept={q!.truth}
                  className="inline-block h-10 w-10 align-middle"
                />
              ) : (
                <span className={q!.kind === "emoji" ? "text-2xl" : ""}>
                  {q!.truth}
                </span>
              )}
              {q!.kind !== "vi" && ` (${q!.word.vi})`}
            </span>
          )}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="btn-red !min-h-[72px] !text-xl"
          disabled={answer !== null}
          onClick={() => pick(false)}
          data-testid="game-false"
        >
          ✗ Sai
        </button>
        <button
          type="button"
          className="btn-green !min-h-[72px] !text-xl"
          disabled={answer !== null}
          onClick={() => pick(true)}
          data-testid="game-true"
        >
          ✓ Đúng
        </button>
      </div>
    </div>
  );
}

/** One of the app's own drawings. */
function Picture({
  concept,
  className,
}: {
  concept: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Hình minh họa"
      data-art={concept}
      dangerouslySetInnerHTML={{ __html: ART[concept] ?? "" }}
    />
  );
}

/** What is shown next to the word: a picture card (drawing or emoji) or a line of text. */
function Clue({ kind, value }: { kind: GameQuestion["kind"]; value: string }) {
  if (kind === "art" || kind === "emoji")
    return (
      <div
        className="flex h-52 w-52 items-center justify-center rounded-[2rem] border-2 border-white bg-[#e3f1fb] shadow-[0_4px_0_rgba(0,0,0,0.06)]"
        data-testid="game-clue"
        data-picture={kind}
      >
        {kind === "art" ? (
          <Picture concept={value} className="h-44 w-44" />
        ) : (
          <span className="text-7xl leading-none">{value}</span>
        )}
      </div>
    );
  return (
    <p
      className="break-words text-2xl font-bold text-ink-600"
      data-testid="game-clue"
    >
      {value}
    </p>
  );
}
