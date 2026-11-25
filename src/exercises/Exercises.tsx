import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise, Tile } from '../lib/exercises';
import { shuffle } from '../lib/exercises';
import type { ExProps } from './types';
import type { Word } from '../types';
import SpeakerButton from '../components/SpeakerButton';
import HanziBox from '../components/HanziBox';
import SpeakCheck from '../components/SpeakCheck';
import { getCourse, isRoman, langName, sentenceKey, sentencePinyin, sentenceZh } from '../data';
import { speak } from '../lib/speech';
import { checkPinyin, numbersToMarks, toneless } from '../lib/pinyin';
import { sfx } from '../lib/sound';
import { PandaSays } from '../components/Panda';
import { Brush } from '../components/Icons';

type Of<K extends Exercise['kind']> = Extract<Exercise, { kind: K }>;

const Title = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-4 text-[22px] font-extrabold leading-tight text-ink-700">{children}</h2>
);

const answerSub = (w: Word) => (w.pinyin ? `${w.pinyin} · ${w.vi}` : w.vi);
/** English-course words have no pinyin: they are typed (spelled) instead. */
const isEn = (w: Word) => !w.pinyin;
/** Korean / Japanese: the romanization is typed, and there is no stroke-order data. */
const roman = () => isRoman();
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
/** Long words (Korean, Japanese) are drawn smaller so that they fit a phone screen. */
const fit = (text: string, base: string, mid: string, small: string) => (text.length > 6 ? small : text.length > 4 ? mid : base);
const spell = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/* ---------- Intro card (new word) ---------- */
export function IntroCard({ ex }: { ex: Of<'intro'> }) {
  const w = ex.word;
  const [showStrokes, setShowStrokes] = useState(false);
  useEffect(() => {
    speak(w.hanzi);
  }, [w.hanzi]);
  return (
    <div className="animate-pop">
      <div className="mb-3 inline-block rounded-lg bg-grape-500/15 px-2 py-1 text-xs font-extrabold uppercase text-grape-600">Từ mới</div>
      <div className="card flex flex-col items-center gap-2 py-6 text-center">
        <div className={`font-han font-bold text-ink-700 ${isEn(w) ? 'text-5xl' : fit(w.hanzi, 'text-7xl', 'text-5xl', 'text-4xl')}`}>{w.hanzi}</div>
        <div className="text-2xl font-extrabold text-sky-600">{w.pinyin}</div>
        <div className="text-xl font-bold text-ink-700">{w.vi}</div>
        <div className="mt-2 flex gap-3">
          <SpeakerButton text={w.hanzi} size="lg" />
          <SpeakerButton text={w.hanzi} size="lg" slow />
        </div>
      </div>
      <div className="card mt-3 flex items-start gap-3">
        <SpeakerButton text={sentenceZh(w)} size="sm" />
        <div>
          <div className="font-han text-xl text-ink-700">{sentenceZh(w)}</div>
          <div className="text-sm font-bold text-sky-600">{sentencePinyin(w)}</div>
          <div className="text-sm font-semibold text-ink-500">{w.ex.vi}</div>
        </div>
      </div>
      {!isEn(w) && !roman() && (
        <div className="mt-3 flex justify-center">
          <button type="button" className="chip flex items-center gap-1" onClick={() => setShowStrokes(!showStrokes)}>
            <Brush size={16} /> {showStrokes ? 'Ẩn cách viết' : 'Xem cách viết'}
          </button>
        </div>
      )}
      {showStrokes && !isEn(w) && !roman() && (
        <div className="mt-3">
          <HanziBox text={w.hanzi} size={170} />
        </div>
      )}
    </div>
  );
}

/* ---------- Listen & pick ---------- */
export function ListenEx({ ex, difficulty, locked, setCheck }: ExProps<Of<'listen'>>) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => speak(ex.word.hanzi), 250);
    return () => clearTimeout(t);
  }, [ex.word.hanzi]);
  useEffect(() => {
    setCheck(
      sel
        ? () => ({ correct: sel === ex.word.id, solution: ex.word.hanzi, solutionSub: answerSub(ex.word) })
        : null,
    );
  }, [sel, ex, setCheck]);
  return (
    <div>
      <Title>Nghe và chọn từ đúng</Title>
      <div className="mb-6 flex justify-center gap-4">
        <SpeakerButton text={ex.word.hanzi} size="xl" />
        <SpeakerButton text={ex.word.hanzi} size="lg" slow className="self-end" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ex.options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={locked}
            onClick={() => {
              setSel(o.id);
              speak(o.hanzi);
            }}
            className={`option flex min-h-[88px] flex-col items-center justify-center text-center ${sel === o.id ? 'option-selected' : ''}`}
          >
            <span className={`font-han ${isEn(o) ? 'text-2xl' : fit(o.hanzi, 'text-3xl', 'text-2xl', 'text-xl')}`}>{o.hanzi}</span>
            {difficulty === 'easy' && <span className="text-sm font-bold text-ink-400">{o.pinyin}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Pick the Vietnamese meaning ---------- */
export function MeaningEx({ ex, difficulty, locked, setCheck }: ExProps<Of<'meaning'>>) {
  const [sel, setSel] = useState<string | null>(null);
  const w = ex.word;
  const zh = ex.sentence ? sentenceZh(w) : w.hanzi;
  const py = ex.sentence ? sentencePinyin(w) : w.pinyin;
  const answer = ex.sentence ? w.ex.vi : w.vi;
  useEffect(() => {
    setCheck(sel ? () => ({ correct: sel === answer, solution: answer, solutionSub: py ? `${zh} · ${py}` : zh }) : null);
  }, [sel, answer, zh, py, setCheck]);
  return (
    <div>
      <Title>{ex.sentence ? 'Câu này có nghĩa là gì?' : 'Chọn nghĩa đúng'}</Title>
      <div className="mb-6 flex items-center gap-3">
        <SpeakerButton text={zh} size="lg" />
        <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-cloud px-4 py-3">
          <div className={`font-han ${ex.sentence ? 'text-2xl' : 'text-4xl'} text-ink-700`}>{zh}</div>
          {difficulty !== 'hard' && py && <div className="text-sm font-bold text-sky-600">{py}</div>}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {ex.options.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={locked}
            onClick={() => setSel(o)}
            className={`option flex items-center gap-3 ${sel === o ? 'option-selected' : ''}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current text-xs opacity-60">{i + 1}</span>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Pick the character for pinyin + meaning ---------- */
export function CharEx({ ex, locked, setCheck }: ExProps<Of<'char'>>) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    setCheck(sel ? () => ({ correct: sel === ex.word.id, solution: ex.word.hanzi, solutionSub: answerSub(ex.word) }) : null);
  }, [sel, ex, setCheck]);
  return (
    <div>
      <Title>{isEn(ex.word) ? 'Chọn từ tiếng Anh đúng' : roman() ? `Chọn từ ${langName()} đúng` : 'Chọn chữ Hán đúng'}</Title>
      <div className="mb-6 rounded-2xl bg-sky-500/10 px-4 py-4 text-center">
        {ex.word.pinyin && <div className="text-3xl font-extrabold text-sky-600">{ex.word.pinyin}</div>}
        <div className="text-lg font-bold text-ink-700">“{ex.word.vi}”</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ex.options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={locked}
            onClick={() => setSel(o.id)}
            className={`option flex min-h-[88px] items-center justify-center font-han ${isEn(o) ? 'text-2xl' : fit(o.hanzi, 'text-4xl', 'text-2xl', 'text-xl')} ${sel === o.id ? 'option-selected' : ''}`}
          >
            {o.hanzi}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Type the pinyin ---------- */
export function TypeEx({ ex, difficulty, locked, setCheck, submit }: ExProps<Of<'type'>>) {
  const [val, setVal] = useState('');
  const [hint, setHint] = useState(0);
  const w = ex.word;
  const en = isEn(w);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ex.mode === 'audio') {
      const t = setTimeout(() => speak(w.hanzi), 250);
      return () => clearTimeout(t);
    }
  }, [ex.mode, w.hanzi]);
  useEffect(() => {
    setCheck(
      val.trim()
        ? () => {
            if (en) return { correct: spell(val) === spell(w.hanzi), solution: w.hanzi, solutionSub: w.vi };
            if (roman()) return { correct: letters(val) === letters(w.pinyin), solution: w.pinyin, solutionSub: `${w.hanzi} · ${w.vi}` };
            const r = checkPinyin(val, w.pinyin);
            return {
              correct: r !== 'wrong',
              solution: w.pinyin,
              solutionSub: `${w.hanzi} · ${w.vi}`,
              note: r === 'toneless' ? `Đúng rồi! Nhớ dấu thanh nhé: ${w.pinyin}` : undefined,
            };
          }
        : null,
    );
  }, [val, w, en, setCheck]);
  const plain = en ? w.hanzi : roman() ? w.pinyin : toneless(w.pinyin);
  const hintText = plain.slice(0, hint) + '•'.repeat(Math.max(0, plain.length - hint));
  return (
    <div>
      <Title>{en ? (ex.mode === 'audio' ? 'Nghe và viết lại từ tiếng Anh' : 'Viết từ này bằng tiếng Anh') : roman() ? (ex.mode === 'audio' ? 'Nghe và gõ phiên âm' : 'Gõ phiên âm của từ này') : ex.mode === 'audio' ? 'Nghe và gõ pinyin' : 'Gõ pinyin của chữ này'}</Title>
      <div className="mb-5 flex items-center justify-center gap-4">
        {ex.mode === 'audio' ? (
          <>
            <SpeakerButton text={w.hanzi} size="xl" />
            <SpeakerButton text={w.hanzi} size="lg" slow className="self-end" />
          </>
        ) : en ? (
          <div className="rounded-2xl border-2 border-cloud px-6 py-4 text-center text-2xl font-extrabold text-ink-700">“{w.vi}”</div>
        ) : (
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl border-2 border-cloud px-6 py-3 font-han text-ink-700 ${fit(w.hanzi, 'text-6xl', 'text-4xl', 'text-3xl')}`}>{w.hanzi}</div>
            <SpeakerButton text={w.hanzi} size="md" />
          </div>
        )}
      </div>
      {!(en && ex.mode === 'char') && (difficulty === 'easy' || (difficulty === 'normal' && ex.mode === 'audio')) && (
        <p className="mb-3 text-center font-bold text-ink-500">Nghĩa: “{w.vi}”</p>
      )}
      <input
        ref={inputRef}
        value={val}
        disabled={locked}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) submit();
        }}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        placeholder={en ? 'Gõ từ tiếng Anh' : roman() ? (getCourse() === 'ko' ? 'Ví dụ: hakgyo' : getCourse() === 'th' ? 'Ví dụ: rongrian' : 'Ví dụ: gakkou') : 'Ví dụ: ni3 hao3 hoặc nǐ hǎo'}
        aria-label={en ? 'Nhập từ tiếng Anh' : roman() ? 'Nhập phiên âm' : 'Nhập pinyin'}
        className="w-full rounded-2xl border-2 border-cloud bg-mist px-4 py-4 text-center text-2xl font-extrabold text-ink-700 outline-none focus:border-sky-400"
      />
      {!en && !roman() && /[1-5]/.test(val) && <p className="mt-2 text-center text-lg font-bold text-sky-600">{numbersToMarks(val)}</p>}
      <p className="mt-2 text-center text-xs font-semibold text-ink-400">
        {en ? 'Gõ đúng chính tả. Không phân biệt chữ hoa, chữ thường.' : roman() ? 'Gõ phiên âm bằng chữ Latinh như hiển thị trong bài. Không phân biệt chữ hoa, dấu cách.' : 'Có thể gõ có dấu (nǐ), số thanh (ni3) hoặc không dấu (ni). Gõ v thay cho ü.'}
      </p>
      {difficulty !== 'hard' && !locked && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <button type="button" className="chip" onClick={() => setHint(Math.min(plain.length, hint + 1))}>
            Gợi ý
          </button>
          {hint > 0 && <span className="font-mono text-lg font-bold tracking-widest text-ink-500">{hintText}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------- Arrange words into a sentence ---------- */
export function ArrangeEx({ ex, difficulty, locked, setCheck }: ExProps<Of<'arrange'>>) {
  const [picked, setPicked] = useState<Tile[]>([]);
  const w = ex.word;
  const correctTiles = ex.tiles.filter((t) => t.id.startsWith('t')).length;
  const accepted = useMemo(
    () => [sentenceZh(w), ...w.ex.alts].map(sentenceKey),
    [w],
  );
  useEffect(() => {
    setCheck(
      picked.length
        ? () => ({
            correct: accepted.includes(sentenceKey(picked.map((t) => t.zh).join(' '))),
            solution: sentenceZh(w),
            solutionSub: sentencePinyin(w),
          })
        : null,
    );
  }, [picked, accepted, w, setCheck]);
  const showPy = difficulty !== 'hard';
  return (
    <div>
      <Title>Sắp xếp thành câu đúng</Title>
      <div className="mb-4 flex items-center gap-3">
        <PandaSays text={w.ex.vi} size={70} />
      </div>
      {difficulty === 'easy' && (
        <div className="mb-2 flex justify-end">
          <SpeakerButton text={sentenceZh(w)} size="sm" label="Nghe câu mẫu" />
        </div>
      )}
      <div className="mb-6 flex min-h-[116px] flex-wrap content-start gap-2 border-b-2 border-t-2 border-cloud py-3">
        {picked.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={locked}
            className="tile animate-pop"
            onClick={() => setPicked(picked.filter((p) => p.id !== t.id))}
          >
            {t.zh}
            {showPy && t.py && <span className="font-sans text-[11px] font-bold text-ink-400">{t.py}</span>}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ex.tiles.map((t) => {
          const used = picked.some((p) => p.id === t.id);
          return (
            <button
              key={t.id}
              type="button"
              disabled={locked || used}
              className={`tile ${used ? 'border-cloud bg-cloud text-transparent shadow-none' : ''}`}
              onClick={() => {
                sfx.tap();
                speak(t.zh);
                setPicked([...picked, t]);
              }}
            >
              {t.zh}
              {showPy && t.py && <span className={`font-sans text-[11px] font-bold ${used ? 'text-transparent' : 'text-ink-400'}`}>{t.py}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-ink-400">Câu có {correctTiles} từ</p>
    </div>
  );
}

/* ---------- Match pairs ---------- */
export function MatchEx({
  ex,
  locked,
  onWrongPair,
  onDone,
}: {
  ex: Of<'match'>;
  locked: boolean;
  onWrongPair: (words: Word[]) => void;
  onDone: (mistakes: Word[]) => void;
}) {
  const left = useMemo(() => shuffle(ex.words), [ex]);
  const right = useMemo(() => shuffle(ex.words), [ex]);
  const [selL, setSelL] = useState<string | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [bad, setBad] = useState<string[]>([]);
  const mistakes = useRef<Word[]>([]);

  useEffect(() => {
    if (!selL || !selR) return;
    if (selL === selR) {
      sfx.correct();
      const next = [...done, selL];
      setDone(next);
      setSelL(null);
      setSelR(null);
      if (next.length === ex.words.length) setTimeout(() => onDone(mistakes.current), 350);
    } else {
      const wl = ex.words.find((w) => w.id === selL)!;
      const wr = ex.words.find((w) => w.id === selR)!;
      setBad([selL, selR]);
      mistakes.current = [...mistakes.current, wl];
      onWrongPair([wl, wr]);
      setTimeout(() => {
        setBad([]);
        setSelL(null);
        setSelR(null);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selL, selR]);

  const cls = (id: string, sel: string | null) =>
    done.includes(id)
      ? 'border-leaf-400 bg-leaf-50 text-leaf-600 opacity-50 shadow-none'
      : bad.includes(id) && sel === id
        ? 'animate-shake border-coral-400 bg-coral-100 text-coral-600'
        : sel === id
          ? 'option-selected'
          : '';

  return (
    <div>
      <Title>Ghép các cặp từ</Title>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {left.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={locked || done.includes(w.id) || bad.length > 0}
              onClick={() => {
                setSelL(w.id);
                speak(w.hanzi);
              }}
              className={`option flex min-h-[64px] items-center justify-center text-center font-han ${isEn(w) ? 'text-xl' : fit(w.hanzi, 'text-2xl', 'text-xl', 'text-lg')} ${cls(w.id, selL)}`}
            >
              {w.hanzi}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {right.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={locked || done.includes(w.id) || bad.length > 0}
              onClick={() => setSelR(w.id)}
              className={`option flex min-h-[64px] items-center justify-center text-center text-[15px] leading-tight ${cls(w.id, selR)}`}
            >
              {w.vi}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Speak (optional, best effort) ---------- */
export function SpeakEx({ ex, setCheck }: ExProps<Of<'speak'>>) {
  const w = ex.word;
  const zh = sentenceZh(w);
  useEffect(() => {
    setCheck(null);
  }, [setCheck]);
  return (
    <div>
      <Title>Đọc to câu này</Title>
      <div className="mb-6 flex items-center gap-3">
        <SpeakerButton text={zh} size="lg" />
        <div className="rounded-2xl border-2 border-cloud px-4 py-3">
          <div className="font-han text-2xl text-ink-700">{zh}</div>
          <div className="text-sm font-bold text-sky-600">{sentencePinyin(w)}</div>
          <div className="text-sm font-semibold text-ink-500">{w.ex.vi}</div>
        </div>
      </div>
      <SpeakCheck
        word={w}
        target={zh}
        onResult={(r) => {
          if (r === 'correct' || r === 'close')
            setCheck(() => ({ correct: true, solution: zh, solutionSub: sentencePinyin(w), note: r === 'close' ? 'Gần đúng rồi, rất tốt!' : undefined }));
        }}
      />
      <p className="mt-4 text-center text-xs font-semibold text-ink-400">Kiểm tra phát âm chỉ mang tính tham khảo. Bạn có thể bỏ qua mà không mất tim.</p>
    </div>
  );
}
