import { useState } from 'react';
import { listenOnce, recognitionSupported } from '../lib/speech';
import { Mic } from './Icons';
import type { Word } from '../types';

export type SpeakResult = 'correct' | 'close' | 'wrong' | 'error';

/** Best-effort pronunciation check: compares the zh-CN transcript with the target characters. */
export function judgeSpeech(alts: string[], target: string): SpeakResult {
  const clean = (s: string) => s.replace(/[\s，。？！,.?!]/g, '');
  const t = clean(target);
  if (alts.some((a) => clean(a) === t || clean(a).includes(t))) return 'correct';
  const tChars = new Set(t);
  const best = Math.max(0, ...alts.map((a) => [...clean(a)].filter((c) => tChars.has(c)).length / tChars.size));
  return best >= 0.6 ? 'close' : 'wrong';
}

export default function SpeakCheck({
  word,
  target,
  onResult,
  compact = false,
}: {
  word: Word;
  target?: string;
  onResult?: (r: SpeakResult, heard: string) => void;
  compact?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle');
  const [heard, setHeard] = useState('');
  const [result, setResult] = useState<SpeakResult | null>(null);
  const text = target ?? word.hanzi;
  if (!recognitionSupported())
    return compact ? null : (
      <p className="text-center text-sm font-semibold text-ink-400">Trình duyệt này chưa hỗ trợ nhận dạng giọng nói (hãy thử Chrome).</p>
    );

  const start = () => {
    setState('listening');
    setHeard('');
    setResult(null);
    const { promise } = listenOnce();
    promise
      .then((alts) => {
        const r = alts.length ? judgeSpeech(alts, text) : 'wrong';
        setHeard(alts[0] ?? '');
        setResult(r);
        setState('done');
        onResult?.(r, alts[0] ?? '');
      })
      .catch(() => {
        setResult('error');
        setState('done');
        onResult?.('error', '');
      });
  };

  const label: Record<SpeakResult, string> = {
    correct: 'Phát âm rất tốt!',
    close: 'Gần đúng rồi, thử lại nhé!',
    wrong: 'Chưa đúng, nghe mẫu rồi thử lại.',
    error: 'Không nghe được. Hãy cho phép micro và thử lại.',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={start}
        disabled={state === 'listening'}
        className={`btn-3d flex items-center gap-2 rounded-2xl px-5 py-3 font-extrabold text-white ${
          state === 'listening' ? 'animate-pulse bg-coral-500 shadow-[0_4px_0_#d93a3a]' : 'bg-grape-500 shadow-[0_4px_0_#a560e8]'
        }`}
      >
        <Mic size={22} /> {state === 'listening' ? 'Đang nghe...' : 'Nhấn để nói'}
      </button>
      {result && (
        <p
          className={`text-center text-sm font-bold ${
            result === 'correct' ? 'text-leaf-600' : result === 'close' ? 'text-sun-600' : 'text-coral-500'
          }`}
        >
          {label[result]} {heard && <span className="font-han text-ink-500">(Nghe được: {heard})</span>}
        </p>
      )}
    </div>
  );
}
