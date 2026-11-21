import { useEffect, useMemo, useRef, useState } from 'react';
import {
  answerText,
  buildMock,
  isAnswered,
  isCorrect,
  maxScore,
  mockName,
  mockSpecs,
  questionCount,
  scoreMock,
  SECTION_LABEL,
  type MockAnswer,
  type MockQuestion,
  type MockScore,
  type MockSpec,
} from '../lib/mock';
import { recordMock, useProgress } from '../lib/store';
import { getCourse } from '../data';
import { speak } from '../lib/speech';
import SpeakerButton from '../components/SpeakerButton';
import Footer from '../components/Footer';
import Panda from '../components/Panda';
import { Chevron, Trophy } from '../components/Icons';

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Standalone, optional "Thi thử HSK" / "Thi thử tiếng Anh" section (follows the course being studied): pick a level, sit the timed paper, review every answer. */
export default function MockScreen({ onClose }: { onClose: () => void }) {
  const p = useProgress();
  const [spec, setSpec] = useState<MockSpec | null>(null);
  const course = getCourse();
  if (spec) return <MockRun key={spec.id} spec={spec} onExit={() => setSpec(null)} />;
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-6 pt-4" data-testid="mock-screen">
      <button type="button" onClick={onClose} className="mb-2 flex items-center gap-1 font-extrabold text-ink-400" data-testid="mock-back">
        <Chevron dir="left" size={22} /> Quay lại
      </button>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-sun-600">
          <Trophy size={34} />
        </span>
        <div>
          <h1 className="text-2xl font-black">{mockName(course)}</h1>
          <p className="text-sm font-semibold text-ink-500">Đề thi dài, tính giờ như thi thật. Không bắt buộc, không ảnh hưởng đến lộ trình học.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {mockSpecs(course).map((s) => {
          const r = p.mock?.[s.id];
          return (
            <div key={s.id} className="card" data-testid={`mock-level-${s.id}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-ink-700">{s.title}</h2>
                {r && (
                  <span className={`rounded-lg px-2 py-0.5 text-sm font-extrabold ${r.passed ? 'bg-leaf-50 text-leaf-600' : 'bg-cloud text-ink-500'}`} data-testid={`mock-best-${s.id}`}>
                    Cao nhất: {r.best}/{r.max}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-ink-500">
                {questionCount(s)} câu · {s.minutes} phút · {s.sections.map((x) => `${SECTION_LABEL[x.id]} ${x.parts.reduce((n, pt) => n + pt.count, 0)} câu`).join(' · ')}
              </p>
              <p className="mb-3 text-xs font-bold text-ink-400">
                Tổng {maxScore(s)} điểm, đạt từ {s.pass} điểm.{r ? ` Đã thi ${r.attempts} lần, lần gần nhất ${r.last} điểm.` : ''}
              </p>
              <button type="button" className="btn-green" onClick={() => setSpec(s)} data-testid={`mock-start-${s.id}`}>
                {r ? 'Thi lại' : 'Bắt đầu thi'}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs font-bold text-ink-400">
        Đề được tạo từ từ vựng và câu ví dụ của từng cấp{course === 'en' ? ', cùng ngân hàng câu hỏi ngữ pháp và đọc hiểu' : ''} – không phải đề thi thật. Mỗi lần thi là một đề mới. Kết quả được lưu trên máy và đồng bộ khi bạn đăng nhập.
      </p>
      <Footer className="mt-auto" />
    </div>
  );
}

function MockRun({ spec, onExit }: { spec: MockSpec; onExit: () => void }) {
  const qs = useMemo(() => buildMock(spec), [spec]);
  const [answers, setAnswers] = useState<MockAnswer[]>(() => qs.map(() => undefined));
  const [cur, setCur] = useState(0);
  const [left, setLeft] = useState(spec.minutes * 60);
  const [result, setResult] = useState<MockScore | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [palette, setPalette] = useState(false);
  const endAt = useRef(Date.now() + spec.minutes * 60000);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submit = () => {
    const s = scoreMock(spec, qs, answersRef.current);
    recordMock(spec.id, s.score, s.max, s.passed);
    setResult(s);
    setConfirm(false);
    window.scrollTo(0, 0);
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) submitRef.current(); // time is up: the paper is handed in automatically
    }, 500);
    return () => clearInterval(t);
  }, [result]);

  const q = qs[cur];
  useEffect(() => {
    if (result || !q.audio) return;
    const t = setTimeout(() => speak(q.audio!), 300);
    return () => clearTimeout(t);
  }, [q, result]);

  if (result) return <MockResultView spec={spec} qs={qs} answers={answers} result={result} onExit={onExit} />;

  const setAnswer = (a: MockAnswer) => setAnswers((prev) => prev.map((x, i) => (i === cur ? a : x)));
  const a = answers[cur];
  const done = answers.filter(isAnswered).length;
  const picked = Array.isArray(a) ? a : [];
  // tiles of an arrange question may repeat, so track them by position
  const usedTiles = (() => {
    const pool = [...q.options];
    const used = new Set<number>();
    for (const t of picked) {
      const i = pool.findIndex((x, k) => x === t && !used.has(k));
      if (i >= 0) used.add(i);
    }
    return used;
  })();

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-4 pt-3" data-testid="mock-run">
      <div className="sticky top-0 z-20 -mx-4 border-b-2 border-cloud bg-white/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="text-sm font-extrabold text-ink-400" onClick={() => setConfirm(true)}>
            ✕ Thoát
          </button>
          <span className="truncate font-black text-ink-700">{spec.course === 'en' ? spec.title : `Thi thử ${spec.title}`}</span>
          <span
            className={`rounded-lg px-2 py-0.5 font-mono text-lg font-black ${left < 300 ? 'bg-coral-100 text-coral-600' : 'bg-sun-100 text-sun-600'}`}
            data-testid="mock-timer"
            aria-label="Thời gian còn lại"
          >
            {clock(left)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-extrabold text-ink-400">
          <span data-testid="mock-progress">
            {SECTION_LABEL[q.section]} · Câu {q.n}/{qs.length}
          </span>
          <button type="button" className="underline" onClick={() => setPalette(!palette)} data-testid="mock-palette-toggle">
            Đã làm {done}/{qs.length} · Danh sách câu
          </button>
        </div>
      </div>

      {palette && (
        <div className="card mt-3 grid grid-cols-8 gap-1.5 !p-3" data-testid="mock-palette">
          {qs.map((x, i) => (
            <button
              key={x.n}
              type="button"
              onClick={() => {
                setCur(i);
                setPalette(false);
              }}
              className={`h-9 rounded-lg text-sm font-extrabold ${i === cur ? 'bg-sky-500 text-white' : isAnswered(answers[i]) ? 'bg-leaf-50 text-leaf-600' : 'bg-cloud text-ink-500'}`}
            >
              {x.n}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex-1" data-testid="mock-question" data-n={q.n}>
        <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-grape-600">{q.part}</p>
        {q.audio && (
          <div className="mb-4 flex justify-center gap-4">
            <SpeakerButton text={q.audio} size="xl" />
            <SpeakerButton text={q.audio} size="lg" slow className="self-end" />
          </div>
        )}
        {q.passage && (
          <div className="mb-3 rounded-2xl bg-mist px-4 py-3 text-[17px] font-semibold leading-relaxed text-ink-700" data-testid="mock-passage">
            {q.passage}
          </div>
        )}
        {(q.prompt || q.sub) && (
          <div className="mb-4 rounded-2xl border-2 border-cloud px-4 py-3">
            {q.prompt && <div className={spec.course === 'en' ? 'text-xl font-extrabold leading-snug text-ink-700' : 'font-han text-3xl leading-snug text-ink-700'}>{q.prompt}</div>}
            {q.sub && <div className="mt-1 text-[15px] font-bold text-ink-500">{q.sub}</div>}
          </div>
        )}

        {q.kind === 'choice' ? (
          <div className="flex flex-col gap-3">
            {q.options.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAnswer(i)}
                data-testid={`mock-option-${i}`}
                className={`option flex items-center gap-3 ${a === i ? 'option-selected' : ''}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current text-xs opacity-60">{'ABCD'[i]}</span>
                <span className={q.han && spec.course === 'zh' ? 'font-han text-2xl' : ''}>{o}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-4 flex min-h-[64px] flex-wrap content-start gap-2 border-b-2 border-t-2 border-cloud py-3" data-testid="mock-arranged">
              {picked.map((t, i) => (
                <button key={i} type="button" className="tile" onClick={() => setAnswer(picked.filter((_, k) => k !== i))}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {q.options.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={usedTiles.has(i)}
                  data-testid={`mock-tile-${i}`}
                  className={`tile ${usedTiles.has(i) ? 'border-cloud bg-cloud text-transparent shadow-none' : ''}`}
                  onClick={() => setAnswer([...picked, t])}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" className={cur === 0 ? 'btn-disabled' : 'btn-white'} disabled={cur === 0} onClick={() => setCur(cur - 1)} data-testid="mock-prev">
          Câu trước
        </button>
        {cur < qs.length - 1 ? (
          <button type="button" className="btn-blue" onClick={() => setCur(cur + 1)} data-testid="mock-next">
            Câu tiếp
          </button>
        ) : (
          <button type="button" className="btn-green" onClick={() => setConfirm(true)} data-testid="mock-submit">
            Nộp bài
          </button>
        )}
      </div>
      {cur < qs.length - 1 && (
        <button type="button" className="mt-3 text-center text-sm font-extrabold text-ink-400 underline" onClick={() => setConfirm(true)} data-testid="mock-submit-early">
          Nộp bài sớm
        </button>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-md animate-pop rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()} data-testid="mock-confirm">
            <h2 className="text-xl font-black text-ink-700">Nộp bài hay thoát?</h2>
            <p className="mb-4 mt-1 font-semibold text-ink-500">
              Bạn đã làm {done}/{qs.length} câu, còn {clock(left)}. Câu bỏ trống được tính là sai. Thoát mà không nộp thì kết quả không được lưu.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" className="btn-green" onClick={submit} data-testid="mock-confirm-submit">
                Nộp bài và xem điểm
              </button>
              <button type="button" className="btn-white" onClick={() => setConfirm(false)}>
                Làm tiếp
              </button>
              <button type="button" className="btn-white !text-coral-500" onClick={onExit} data-testid="mock-quit">
                Thoát, không lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MockResultView({ spec, qs, answers, result, onExit }: { spec: MockSpec; qs: MockQuestion[]; answers: MockAnswer[]; result: MockScore; onExit: () => void }) {
  const p = useProgress();
  const [onlyWrong, setOnlyWrong] = useState(false);
  const best = p.mock?.[spec.id];
  const shown = qs.map((q, i) => ({ q, a: answers[i], ok: isCorrect(q, answers[i]) })).filter((x) => !onlyWrong || !x.ok);
  return (
    <div className="mx-auto min-h-[100dvh] max-w-md px-4 pb-6 pt-6" data-testid="mock-result">
      <div className="text-center">
        <Panda size={96} mood={result.passed ? 'cheer' : 'happy'} className="mx-auto" />
        <h1 className="mt-2 text-2xl font-black text-ink-700">Kết quả thi thử {spec.title}</h1>
        <div className={`mt-2 text-6xl font-black ${result.passed ? 'text-leaf-500' : 'text-coral-500'}`} data-testid="mock-score">
          {result.score}
          <span className="text-2xl text-ink-400">/{result.max}</span>
        </div>
        <p className={`mt-1 font-extrabold ${result.passed ? 'text-leaf-600' : 'text-coral-500'}`} data-testid="mock-verdict">
          {result.passed ? `Đạt (từ ${spec.pass} điểm)` : `Chưa đạt (cần ${spec.pass} điểm)`} · đúng {result.correct}/{result.total} câu
        </p>
        {best && (
          <p className="text-sm font-bold text-ink-400" data-testid="mock-best">
            Điểm cao nhất của bạn: {best.best}/{best.max}
          </p>
        )}
      </div>
      <div className={`mt-4 grid gap-2 ${result.sections.length === 3 ? 'grid-cols-3' : result.sections.length === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {result.sections.map((s) => (
          <div key={s.id} className="card !p-3 text-center" data-testid={`mock-section-${s.id}`}>
            <div className="text-xs font-extrabold uppercase text-ink-400">{SECTION_LABEL[s.id]}</div>
            <div className="text-2xl font-black text-ink-700">{s.score}</div>
            <div className="text-xs font-bold text-ink-400">
              {s.correct}/{s.total} câu
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-green mt-4" onClick={onExit} data-testid="mock-done">
        Xong
      </button>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="text-lg font-black">Xem lại đáp án</h2>
        <button type="button" className={`chip !text-xs ${onlyWrong ? 'chip-active' : ''}`} onClick={() => setOnlyWrong(!onlyWrong)} data-testid="mock-only-wrong">
          Chỉ câu sai
        </button>
      </div>
      <div className="flex flex-col gap-2" data-testid="mock-review">
        {shown.map(({ q, a, ok }) => (
          <div key={q.n} className={`card !p-3 ${ok ? '' : '!border-coral-400'}`} data-testid="mock-review-item" data-ok={ok}>
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-ink-400">
                Câu {q.n} · {SECTION_LABEL[q.section]}
              </span>
              <span className={ok ? 'text-leaf-600' : 'text-coral-500'}>{ok ? '✓ Đúng' : isAnswered(a) ? '✗ Sai' : '✗ Bỏ trống'}</span>
            </div>
            <p className="mt-1 text-xs font-bold text-ink-400">{q.part}</p>
            <div className="mt-1 flex items-start gap-2">
              {q.audio && <SpeakerButton text={q.audio} size="sm" />}
              <div className="min-w-0">
                {q.passage && <div className="mb-1 text-sm font-semibold text-ink-500">{q.passage}</div>}
                {(q.prompt || q.audio) && <div className={spec.course === 'en' ? 'text-base font-extrabold text-ink-700' : 'font-han text-xl text-ink-700'}>{q.prompt ?? q.audio}</div>}
                {q.sub && <div className="text-sm font-bold text-ink-500">{q.sub}</div>}
              </div>
            </div>
            <p className="mt-2 text-sm font-bold">
              <span className="text-ink-400">Bạn chọn: </span>
              <span className={ok ? 'text-leaf-600' : 'text-coral-500'}>{answerText(q, a)}</span>
            </p>
            <p className="text-sm font-bold">
              <span className="text-ink-400">Đáp án đúng: </span>
              <span className="text-leaf-600">{q.solution}</span>
            </p>
            <p className="mt-1 rounded-xl bg-mist px-3 py-2 text-sm font-semibold text-ink-500">
              <b className="text-ink-700">Giải thích:</b> {q.explain}
            </p>
          </div>
        ))}
        {shown.length === 0 && <p className="font-bold text-ink-400">Không có câu sai nào. Tuyệt vời!</p>}
      </div>
      <Footer className="mt-4" />
    </div>
  );
}
