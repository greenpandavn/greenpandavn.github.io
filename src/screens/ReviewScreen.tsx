import { useState } from 'react';
import { useProgress } from '../lib/store';
import { countByStatus, weakestWords, STATUS_LABEL, wordStatus } from '../lib/srs';
import { PandaSays } from '../components/Panda';
import SpeakerButton from '../components/SpeakerButton';
import WordSheet from '../components/WordSheet';
import type { Word } from '../types';

export default function ReviewScreen({ onStart }: { onStart: () => void }) {
  const p = useProgress();
  const counts = countByStatus(p);
  const weak = weakestWords(p, 10);
  const [sheet, setSheet] = useState<Word | null>(null);
  const has = weak.length > 0;
  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <h1 className="mb-3 text-2xl font-black">Ôn tập thông minh</h1>
      <PandaSays
        mood={has ? 'happy' : 'think'}
        text={has ? 'Mình đã chọn ra những từ bạn hay quên nhất. Ôn ngay nhé!' : 'Hãy học bài đầu tiên, rồi quay lại đây để ôn tập nhé!'}
      />
      <div className="my-4 grid grid-cols-3 gap-3 text-center">
        {(['new', 'learning', 'mastered'] as const).map((k) => (
          <div key={k} className="card !p-3">
            <div className={`text-2xl font-black ${k === 'mastered' ? 'text-sun-600' : k === 'learning' ? 'text-sky-600' : 'text-ink-400'}`}>
              {counts[k]}
            </div>
            <div className="text-xs font-extrabold text-ink-500">{STATUS_LABEL[k]}</div>
          </div>
        ))}
      </div>
      <button type="button" className={has ? 'btn-green' : 'btn-disabled'} disabled={!has} onClick={onStart} data-testid="start-review">
        Bắt đầu ôn tập ({weak.length} từ)
      </button>
      {has && (
        <>
          <h2 className="mb-2 mt-6 text-lg font-black">Từ yếu nhất</h2>
          <ul className="flex flex-col gap-2" data-testid="weak-words">
            {weak.map((w) => {
              const wp = p.words[w.id];
              return (
                <li key={w.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSheet(w)}
                    onKeyDown={(e) => e.key === 'Enter' && setSheet(w)}
                    className="card flex w-full cursor-pointer items-center gap-3 !py-3 text-left"
                  >
                    <span className="w-16 shrink-0 font-han text-2xl">{w.hanzi}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold text-sky-600">{w.pinyin}</span>
                      <span className="block truncate text-sm font-semibold text-ink-500">{w.vi}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="flex gap-0.5" aria-label={`Độ nhớ ${wp.strength}/5`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`h-2 w-3 rounded-sm ${i < wp.strength ? 'bg-leaf-500' : 'bg-cloud'}`} />
                        ))}
                      </span>
                      <span className="text-[11px] font-bold text-ink-400">
                        {STATUS_LABEL[wordStatus(wp)]} · sai {wp.wrong}
                      </span>
                    </span>
                    <SpeakerButton text={w.hanzi} size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {sheet && <WordSheet word={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
