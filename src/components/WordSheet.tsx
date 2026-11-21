import type { Word } from '../types';
import { sentencePinyin, sentenceZh } from '../data';
import SpeakerButton from './SpeakerButton';
import HanziBox from './HanziBox';
import SpeakCheck from './SpeakCheck';
import { Close } from './Icons';
import { useProgress } from '../lib/store';
import { STATUS_LABEL, wordStatus } from '../lib/srs';

export default function WordSheet({ word, onClose }: { word: Word; onClose: () => void }) {
  const p = useProgress();
  const wp = p.words[word.id];
  const status = wordStatus(wp);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-md animate-slideUp overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Chi tiết từ ${word.hanzi}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              status === 'mastered' ? 'bg-sun-100 text-sun-600' : status === 'learning' ? 'bg-sky-500/10 text-sky-600' : 'bg-cloud text-ink-500'
            }`}
          >
            {STATUS_LABEL[status]}
            {wp ? ` · ${'★'.repeat(wp.strength)}${'☆'.repeat(5 - wp.strength)}` : ''}
          </span>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-400 hover:bg-cloud" aria-label="Đóng">
            <Close size={22} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-han text-6xl font-bold text-ink-700">{word.hanzi}</div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold text-sky-600">{word.pinyin}</div>
            <div className="text-lg font-bold text-ink-700">{word.vi}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <SpeakerButton text={word.hanzi} size="md" />
          <SpeakerButton text={word.hanzi} size="md" slow />
        </div>

        <div className="mt-5 rounded-2xl border-2 border-cloud p-4">
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink-400">Ví dụ</div>
          <div className="flex items-start gap-3">
            <SpeakerButton text={sentenceZh(word)} size="sm" />
            <div>
              <div className="font-han text-xl text-ink-700">{sentenceZh(word)}</div>
              <div className="text-sm font-bold text-sky-600">{sentencePinyin(word)}</div>
              <div className="text-sm font-semibold text-ink-500">{word.ex.vi}</div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-400">Thứ tự nét viết</div>
          <HanziBox text={word.hanzi} size={190} />
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-400">Luyện phát âm</div>
          <SpeakCheck word={word} />
        </div>
      </div>
    </div>
  );
}
