import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';

const cache = new Map<string, Promise<unknown>>();

function loadChar(char: string) {
  if (!cache.has(char)) {
    const local = `${import.meta.env.BASE_URL}hanzi/${encodeURIComponent(char)}.json`;
    const cdn = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`;
    const p = fetch(local)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('local missing'))))
      .catch(() => fetch(cdn).then((r) => (r.ok ? r.json() : Promise.reject(new Error('not found')))));
    p.catch(() => cache.delete(char));
    cache.set(char, p);
  }
  return cache.get(char)!;
}

type Mode = 'animate' | 'quiz';

/** Stroke-order animation + tracing practice for one character (HanziWriter, MIT). */
export function HanziChar({ char, size = 200, autoAnimate = true }: { char: string; size?: number; autoAnimate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [mode, setMode] = useState<Mode>('animate');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    setError(false);
    const w = HanziWriter.create(ref.current, char, {
      width: size,
      height: size,
      padding: 10,
      showOutline: true,
      strokeColor: '#4b4b4b',
      radicalColor: '#1cb0f6',
      outlineColor: '#e5e5e5',
      highlightColor: '#58cc02',
      drawingColor: '#1cb0f6',
      drawingWidth: 22,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 250,
      showHintAfterMisses: 2,
      charDataLoader: (c, onLoad, onError) => {
        loadChar(c)
          .then((d) => onLoad(d as Parameters<typeof onLoad>[0]))
          .catch((e) => {
            setError(true);
            onError(e);
          });
      },
    });
    writerRef.current = w;
    if (autoAnimate) void w.animateCharacter();
    return () => {
      writerRef.current = null;
    };
  }, [char, size, autoAnimate]);

  const animate = () => {
    setMode('animate');
    setMsg('');
    const w = writerRef.current;
    if (!w) return;
    w.cancelQuiz();
    void w.showCharacter();
    void w.animateCharacter();
  };

  const quiz = () => {
    setMode('quiz');
    setMsg('Hãy tô theo từng nét theo đúng thứ tự!');
    const w = writerRef.current;
    if (!w) return;
    void w.quiz({
      onMistake: () => setMsg('Chưa đúng nét, thử lại nhé!'),
      onCorrectStroke: (d) => setMsg(`Đúng rồi! Còn ${d.strokesRemaining} nét`),
      onComplete: (d) => setMsg(d.totalMistakes === 0 ? 'Tuyệt vời! Viết hoàn hảo!' : `Xong! Sai ${d.totalMistakes} lần.`),
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative rounded-2xl border-2 border-cloud bg-white" style={{ width: size + 4, height: size + 4 }}>
        <svg className="pointer-events-none absolute inset-0" width={size + 4} height={size + 4} aria-hidden>
          <g stroke="#f0d6d6" strokeDasharray="4 4" strokeWidth="1">
            <line x1="0" y1="0" x2={size + 4} y2={size + 4} />
            <line x1={size + 4} y1="0" x2="0" y2={size + 4} />
            <line x1={(size + 4) / 2} y1="0" x2={(size + 4) / 2} y2={size + 4} />
            <line x1="0" y1={(size + 4) / 2} x2={size + 4} y2={(size + 4) / 2} />
          </g>
        </svg>
        <div ref={ref} className="relative touch-none" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center font-han text-7xl text-ink-700">{char}</div>
        )}
      </div>
      {!error && (
        <div className="flex gap-2">
          <button type="button" onClick={animate} className={`chip ${mode === 'animate' ? 'chip-active' : ''}`}>
            Xem nét viết
          </button>
          <button type="button" onClick={quiz} className={`chip ${mode === 'quiz' ? 'chip-active' : ''}`}>
            Tập tô chữ
          </button>
        </div>
      )}
      <p className="min-h-[1.25rem] text-center text-sm font-bold text-ink-500">{error ? 'Không tải được dữ liệu nét chữ.' : msg}</p>
    </div>
  );
}

export default function HanziBox({ text, size = 200 }: { text: string; size?: number }) {
  const chars = [...text].filter((c) => /\p{Script=Han}/u.test(c));
  const [idx, setIdx] = useState(0);
  const char = chars[Math.min(idx, chars.length - 1)];
  if (!char) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      {chars.length > 1 && (
        <div className="flex gap-2">
          {chars.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-11 w-11 rounded-xl border-2 font-han text-2xl ${
                i === idx ? 'border-sky-500 bg-sky-500/10 text-sky-600' : 'border-cloud text-ink-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <HanziChar key={char} char={char} size={size} />
    </div>
  );
}
