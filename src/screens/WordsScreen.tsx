import { useEffect, useMemo, useState } from 'react';
import { LESSONS, courseLoaded, getCourse, isEnglish, isRoman, langName, loadCourse, useContentVersion } from '../data';
import { useProgress } from '../lib/store';
import { wordStatus } from '../lib/srs';
import { toneless } from '../lib/pinyin';
import SpeakerButton from '../components/SpeakerButton';
import WordSheet from '../components/WordSheet';
import type { Word } from '../types';

const DOT = { new: 'bg-cloud', learning: 'bg-sky-500', mastered: 'bg-sun-500' };

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export default function WordsScreen() {
  const p = useProgress();
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState<Word | null>(null);
  const query = fold(q.trim());
  // the list fills in level by level while the course is downloaded
  const version = useContentVersion();
  const [failed, setFailed] = useState(false);
  const loaded = courseLoaded();
  useEffect(() => {
    if (loaded || failed) return;
    let live = true;
    loadCourse(getCourse()).catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [loaded, failed, version]);
  const groups = useMemo(
    () =>
      LESSONS.map((l) => ({
        l,
        words: l.words.filter(
          (w) => !query || w.hanzi.toLowerCase().includes(q.trim().toLowerCase()) || (!!w.pinyin && toneless(w.pinyin).includes(toneless(q))) || fold(w.vi).includes(query),
        ),
      })).filter((g) => g.words.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- LESSONS changes with `version`
    [q, query, version],
  );
  const total = LESSONS.reduce((n, l) => n + l.wordCount, 0);
  return (
    <div className="mx-auto max-w-md px-4 pb-2 pt-4">
      <h1 className="text-2xl font-black">Từ vựng</h1>
      <p className="mb-3 text-sm font-semibold text-ink-500">{total} từ · chạm vào từ để nghe{getCourse() === 'zh' ? ', xem nét viết' : ''} và luyện nói</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={isEnglish() ? 'Tìm từ tiếng Anh hoặc nghĩa...' : isRoman() ? `Tìm từ ${langName()}, phiên âm hoặc nghĩa...` : 'Tìm chữ Hán, pinyin hoặc nghĩa...'}
        aria-label="Tìm từ"
        className="mb-4 w-full rounded-2xl border-2 border-cloud bg-mist px-4 py-3 font-bold outline-none focus:border-sky-400"
      />
      {!loaded && (
        <p className="mb-4 text-sm font-bold text-ink-400" data-testid="words-loading">
          {failed ? (
            <>
              Không tải được hết từ vựng.{' '}
              <button type="button" className="font-black text-sky-600 underline" onClick={() => setFailed(false)}>
                Thử lại
              </button>
            </>
          ) : (
            'Đang tải thêm từ vựng…'
          )}
        </p>
      )}
      {groups.map(({ l, words }) => (
        <section key={l.id} className="mb-5">
          <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-ink-400">{l.title}</h2>
          <ul className="flex flex-col gap-2">
            {words.map((w) => (
              <li key={w.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSheet(w)}
                  onKeyDown={(e) => e.key === 'Enter' && setSheet(w)}
                  className="card flex cursor-pointer items-center gap-3 !py-2.5"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[wordStatus(p.words[w.id])]}`} />
                  <span className="w-16 shrink-0 font-han text-2xl">{w.hanzi}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-sky-600">{w.pinyin}</span>
                    <span className="block truncate text-sm font-semibold text-ink-500">{w.vi}</span>
                  </span>
                  <SpeakerButton text={w.hanzi} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {sheet && <WordSheet word={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
