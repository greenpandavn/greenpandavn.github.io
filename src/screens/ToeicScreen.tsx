import { useEffect, useMemo, useRef, useState } from "react";
import ScrollButtons from "../components/ScrollButtons";
import Footer from "../components/Footer";
import Panda from "../components/Panda";
import { Speaker } from "../components/Icons";
import { speakSeq, stopSpeaking } from "../lib/speech";
import { recordMock, useProgress } from "../lib/store";
import {
  buildToeic,
  scoreToeic,
  TOEIC_MAX,
  TOEIC_PARTS,
  TOEIC_SECTIONS,
  transcript,
  type ToeicAnswer,
  type ToeicQuestion,
  type ToeicScore,
  type ToeicSection,
  type ToeicTest,
} from "../lib/toeic";

const clock = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const LETTER = "ABCD";
const sectionOf = (id: ToeicSection) =>
  TOEIC_SECTIONS.find((s) => s.id === id)!;

function PlayButton({ audio, small }: { audio: string[]; small?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      aria-label="Nghe lại"
      data-testid="toeic-play"
      onClick={() => {
        setPlaying(true);
        speakSeq(audio, { onEnd: () => setPlaying(false) });
      }}
      className={`btn-3d inline-flex shrink-0 items-center justify-center bg-sky-500 text-white shadow-[0_4px_0_#1899d6] ${small ? "h-9 w-9 rounded-xl" : "h-20 w-20 rounded-3xl"} ${playing ? "animate-pulse" : ""}`}
    >
      <Speaker size={small ? 18 : 40} />
    </button>
  );
}

/** One timed TOEIC paper: Listening (45 min) then Reading (75 min), then the score and the answer review. */
export default function ToeicRun({
  test,
  onExit,
}: {
  test: ToeicTest;
  onExit: () => void;
}) {
  const qs = useMemo(() => buildToeic(test), [test]);
  const [answers, setAnswers] = useState<ToeicAnswer[]>(() =>
    qs.map(() => undefined),
  );
  const [cur, setCur] = useState(0);
  const [phase, setPhase] = useState(0); // index in TOEIC_SECTIONS
  const [left, setLeft] = useState(TOEIC_SECTIONS[0].minutes * 60);
  const [result, setResult] = useState<ToeicScore | null>(null);
  const [confirm, setConfirm] = useState<"next" | "submit" | null>(null);
  const [palette, setPalette] = useState(false);
  const endAt = useRef(Date.now() + TOEIC_SECTIONS[0].minutes * 60000);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const section = TOEIC_SECTIONS[phase];
  const last = phase === TOEIC_SECTIONS.length - 1;
  const first = qs.findIndex((q) => q.section === section.id);
  const end = first + qs.filter((q) => q.section === section.id).length - 1;
  const later = TOEIC_SECTIONS.slice(phase + 1).reduce(
    (n, s) => n + s.minutes * 60,
    0,
  );

  /** Hand in the current section: the next one starts with its own clock, the last one ends the paper. */
  const advance = () => {
    stopSpeaking();
    setConfirm(null);
    setPalette(false);
    if (!last) {
      const next = TOEIC_SECTIONS[phase + 1];
      endAt.current = Date.now() + next.minutes * 60000;
      setLeft(next.minutes * 60);
      setPhase(phase + 1);
      setCur(qs.findIndex((q) => q.section === next.id));
      window.scrollTo(0, 0);
      return;
    }
    const s = scoreToeic(qs, answersRef.current);
    recordMock(test.id, s.score, s.max, false);
    setResult(s);
    window.scrollTo(0, 0);
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) advanceRef.current(); // time is up: the section is handed in automatically
    }, 500);
    return () => clearInterval(t);
  }, [result]);

  const [showText, setShowText] = useState(false);
  const q = qs[cur];
  const group = q.group;
  // the audio is played once when a new photo / question / conversation / talk is reached
  useEffect(() => {
    if (result || !q.audio) return;
    const t = setTimeout(() => speakSeq(q.audio!), 300);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, result]);

  if (result)
    return (
      <ToeicResult
        test={test}
        qs={qs}
        answers={answers}
        result={result}
        onExit={onExit}
      />
    );

  const a = answers[cur];
  const inSection = qs.slice(first, end + 1);
  const done = inSection.filter(
    (_, i) => answers[first + i] !== undefined,
  ).length;
  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-4 pt-3"
      data-testid="toeic-run"
    >
      <div className="sticky top-0 z-20 -mx-4 border-b-2 border-cloud bg-white/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm font-extrabold text-ink-400"
            onClick={() => setConfirm("submit")}
            data-testid="toeic-exit"
          >
            ✕ Thoát
          </button>
          <span className="truncate font-black text-ink-700">{test.title}</span>
          <span className="text-right text-xs font-extrabold text-ink-400">
            Phần {section.label}{" "}
            <span
              className={`rounded-lg px-2 py-0.5 font-mono text-lg font-black ${left < 300 ? "bg-coral-100 text-coral-600" : "bg-sun-100 text-sun-600"}`}
              data-testid="toeic-timer-section"
            >
              {clock(left)}
            </span>
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-extrabold text-ink-400">
          <span data-testid="toeic-progress">
            Part {q.part} · Câu {q.n}/{qs.length}
          </span>
          <span>
            Toàn bài còn{" "}
            <span
              className="font-mono text-ink-700"
              data-testid="toeic-timer-total"
            >
              {clock(left + later)}
            </span>
          </span>
        </div>
        <button
          type="button"
          className="mt-1 text-xs font-extrabold text-ink-400 underline"
          onClick={() => setPalette(!palette)}
          data-testid="toeic-palette-toggle"
        >
          Đã làm {done}/{inSection.length} câu phần {section.label} · Danh sách
          câu
        </button>
      </div>

      {palette && (
        <div
          className="card mt-3 grid grid-cols-8 gap-1.5 !p-3"
          data-testid="toeic-palette"
        >
          {inSection.map((x, i) => (
            <button
              key={x.n}
              type="button"
              onClick={() => {
                setCur(first + i);
                setPalette(false);
              }}
              className={`h-9 rounded-lg text-sm font-extrabold ${first + i === cur ? "bg-sky-500 text-white" : answers[first + i] !== undefined ? "bg-leaf-50 text-leaf-600" : "bg-cloud text-ink-500"}`}
            >
              {x.n}
            </button>
          ))}
        </div>
      )}

      <div
        className="mt-4 flex-1"
        data-testid="toeic-question"
        data-n={q.n}
        data-part={q.part}
      >
        <p className="mb-3 text-sm font-extrabold tracking-wide text-grape-600">
          {TOEIC_PARTS[q.part].title}
        </p>
        {q.scene && (
          <div
            className="mb-3 rounded-2xl bg-mist px-4 py-3 text-[17px] font-semibold leading-relaxed text-ink-700"
            data-testid="toeic-scene"
          >
            <b>Ảnh:</b> {q.scene}
          </div>
        )}
        {q.audio && (
          <div className="mb-4 flex justify-center">
            <PlayButton audio={q.audio} />
          </div>
        )}
        {q.passage && (
          <div
            className="mb-3 flex flex-col gap-2 rounded-2xl bg-mist px-4 py-3 text-[16px] font-semibold leading-relaxed text-ink-700"
            data-testid="toeic-passage"
          >
            {q.passage.map((line, i) => (
              <p
                key={i}
                className={
                  /^—.*—$/.test(line)
                    ? "text-xs font-black uppercase text-grape-600"
                    : ""
                }
              >
                {line}
              </p>
            ))}
          </div>
        )}
        {q.prompt && (
          <div className="mb-4 rounded-2xl border-2 border-cloud px-4 py-3 text-lg font-extrabold leading-snug text-ink-700">
            {q.prompt}
          </div>
        )}
        {q.heardOnly && (
          <p
            className="mb-3 text-center text-sm font-bold text-ink-500"
            data-testid="toeic-heard-hint"
          >
            {showText
              ? "Đang hiện chữ của đáp án (trong bài thi thật chỉ được nghe)."
              : "Như bài thi thật, các đáp án phần này chỉ được đọc lên, không in ra. Bấm loa để nghe lại."}{" "}
            <button
              type="button"
              className="font-extrabold text-sky-600 underline"
              onClick={() => setShowText((v) => !v)}
              data-testid="toeic-show-text"
            >
              {showText ? "Ẩn chữ đáp án" : "Không nghe được? Hiện chữ đáp án"}
            </button>
          </p>
        )}
        <div
          className={
            q.heardOnly && !showText
              ? "grid grid-cols-2 gap-3"
              : "flex flex-col gap-3"
          }
        >
          {q.options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setAnswers((prev) => prev.map((x, k) => (k === cur ? i : x)))
              }
              data-testid={`toeic-option-${i}`}
              className={`option flex items-center gap-3 ${a === i ? "option-selected" : ""}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current text-xs opacity-60">
                {LETTER[i]}
              </span>
              <span>{q.heardOnly && !showText ? `Đáp án ${LETTER[i]}` : o}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          className={cur === first ? "btn-disabled" : "btn-white"}
          disabled={cur === first}
          onClick={() => setCur(cur - 1)}
          data-testid="toeic-prev"
        >
          Câu trước
        </button>
        {cur < end ? (
          <button
            type="button"
            className="btn-blue"
            onClick={() => setCur(cur + 1)}
            data-testid="toeic-next"
          >
            Câu tiếp
          </button>
        ) : (
          <button
            type="button"
            className="btn-green"
            onClick={() => setConfirm("next")}
            data-testid="toeic-finish-section"
          >
            {last ? "Nộp bài" : "Sang phần Đọc"}
          </button>
        )}
      </div>
      {cur < end && (
        <button
          type="button"
          className="mt-3 text-center text-sm font-extrabold text-ink-400 underline"
          onClick={() => setConfirm("next")}
          data-testid="toeic-finish-early"
        >
          {last ? "Nộp bài sớm" : "Kết thúc phần Nghe, sang phần Đọc"}
        </button>
      )}

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={() => setConfirm(null)}
        >
          <div
            className="w-full max-w-md animate-pop rounded-3xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
            data-testid="toeic-confirm"
          >
            <h2 className="text-xl font-black text-ink-700">
              {last ? "Nộp bài hay thoát?" : "Kết thúc phần Nghe?"}
            </h2>
            <p className="mb-4 mt-1 font-semibold text-ink-500">
              Bạn đã làm {done}/{inSection.length} câu phần {section.label}, còn{" "}
              {clock(left)}. Câu bỏ trống được tính là sai.
              {last
                ? " Thoát mà không nộp thì kết quả không được lưu."
                : " Sang phần Đọc rồi thì không quay lại phần Nghe được, giống như thi thật."}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-green"
                onClick={advance}
                data-testid="toeic-confirm-next"
              >
                {last ? "Nộp bài và xem điểm" : "Sang phần Đọc (75 phút)"}
              </button>
              <button
                type="button"
                className="btn-white"
                onClick={() => setConfirm(null)}
              >
                Làm tiếp
              </button>
              {(last || confirm === "submit") && (
                <button
                  type="button"
                  className="btn-white !text-coral-500"
                  onClick={() => {
                    stopSpeaking();
                    onExit();
                  }}
                  data-testid="toeic-quit"
                >
                  Thoát, không lưu
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToeicResult({
  test,
  qs,
  answers,
  result,
  onExit,
}: {
  test: ToeicTest;
  qs: ToeicQuestion[];
  answers: ToeicAnswer[];
  result: ToeicScore;
  onExit: () => void;
}) {
  const p = useProgress();
  const [onlyWrong, setOnlyWrong] = useState(false);
  const best = p.mock?.[test.id];
  const shown = qs
    .map((q, i) => ({ q, a: answers[i], ok: answers[i] === q.answer }))
    .filter((x) => !onlyWrong || !x.ok);
  return (
    <div
      className="mx-auto min-h-[100dvh] max-w-md px-4 pb-6 pt-6"
      data-testid="toeic-result"
    >
      <ScrollButtons className="bottom-4" />
      <div className="text-center">
        <Panda size={96} mood="cheer" className="mx-auto" />
        <h1 className="mt-2 text-2xl font-black text-ink-700">
          Kết quả thi thử {test.title}
        </h1>
        <div
          className="mt-2 text-6xl font-black text-leaf-500"
          data-testid="toeic-score"
        >
          {result.score}
          <span className="text-2xl text-ink-400">/{TOEIC_MAX}</span>
        </div>
        <p className="mt-1 font-extrabold text-ink-500">
          Đúng {result.correct}/{result.total} câu
        </p>
        {best && (
          <p
            className="text-sm font-bold text-ink-400"
            data-testid="toeic-best"
          >
            Điểm cao nhất của bạn: {best.best}/{best.max}
          </p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {result.sections.map((s) => (
          <div
            key={s.id}
            className="card !p-3 text-center"
            data-testid={`toeic-section-${s.id}`}
          >
            <div className="text-xs font-extrabold uppercase text-ink-400">
              {sectionOf(s.id).label} (5–495)
            </div>
            <div className="text-3xl font-black text-ink-700">{s.score}</div>
            <div className="text-xs font-bold text-ink-400">
              {s.correct}/{s.total} câu
            </div>
          </div>
        ))}
      </div>
      <div
        className="card mt-2 !p-3 text-sm font-bold text-ink-500"
        data-testid="toeic-parts"
      >
        {result.parts.map((x) => (
          <div key={x.part} className="flex justify-between">
            <span>
              Part {x.part} – {TOEIC_PARTS[x.part].name}
            </span>
            <span className="text-ink-700">
              {x.correct}/{x.total}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-bold text-ink-400">
        Điểm quy đổi theo thang 10–990 là ước lượng; bảng quy đổi của kỳ thi
        thật thay đổi theo từng đề.
      </p>
      <button
        type="button"
        className="btn-green mt-4"
        onClick={onExit}
        data-testid="toeic-done"
      >
        Xong
      </button>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="text-lg font-black">Xem lại đáp án</h2>
        <button
          type="button"
          className={`chip !text-xs ${onlyWrong ? "chip-active" : ""}`}
          onClick={() => setOnlyWrong(!onlyWrong)}
          data-testid="toeic-only-wrong"
        >
          Chỉ câu sai
        </button>
      </div>
      <div className="flex flex-col gap-2" data-testid="toeic-review">
        {shown.map(({ q, a, ok }) => (
          <div
            key={q.n}
            className={`card !p-3 ${ok ? "" : "!border-coral-400"}`}
            data-testid="toeic-review-item"
            data-ok={ok}
          >
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-ink-400">
                Câu {q.n} · Part {q.part} – {TOEIC_PARTS[q.part].name}
              </span>
              <span className={ok ? "text-leaf-600" : "text-coral-500"}>
                {ok ? "✓ Đúng" : a !== undefined ? "✗ Sai" : "✗ Bỏ trống"}
              </span>
            </div>
            {q.scene && (
              <p className="mt-1 text-sm font-semibold text-ink-500">
                Ảnh: {q.scene}
              </p>
            )}
            <div className="mt-1 flex items-start gap-2">
              {q.audio && <PlayButton audio={q.audio} small />}
              <div className="min-w-0 text-sm font-semibold text-ink-500">
                {(q.audio ? transcript(test, q) : (q.passage ?? [])).map(
                  (line, i) => (
                    <p key={i}>{line}</p>
                  ),
                )}
              </div>
            </div>
            {q.prompt && (
              <p className="mt-1 font-extrabold text-ink-700">{q.prompt}</p>
            )}
            <p className="mt-2 text-sm font-bold">
              <span className="text-ink-400">Bạn chọn: </span>
              <span className={ok ? "text-leaf-600" : "text-coral-500"}>
                {a === undefined
                  ? "(bỏ trống)"
                  : `${LETTER[a]}. ${q.options[a]}`}
              </span>
            </p>
            <p className="text-sm font-bold">
              <span className="text-ink-400">Đáp án đúng: </span>
              <span className="text-leaf-600">
                {LETTER[q.answer]}. {q.solution}
              </span>
            </p>
            <p className="mt-1 rounded-xl bg-mist px-3 py-2 text-sm font-semibold text-ink-500">
              <b className="text-ink-700">Giải thích:</b> {q.explain}
            </p>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="font-bold text-ink-400">
            Không có câu sai nào. Tuyệt vời!
          </p>
        )}
      </div>
      <Footer className="mt-4" />
    </div>
  );
}
