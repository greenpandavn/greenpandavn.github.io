import { LEVELS, setLevel } from '../lib/unlock';
import type { StartLevel } from '../types';
import Panda from './Panda';
import Footer from './Footer';

const GLYPH: Record<StartLevel, string> = { new: '🌱', some: '🌿', done: '🌳' };

/** First-launch self-assessment (no placement test): just pick a starting point. */
export default function LevelPicker() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-10" data-testid="level-picker">
      <Panda size={110} mood="happy" className="mx-auto" />
      <h1 className="mt-3 text-center text-2xl font-black">Bạn biết tiếng Trung đến đâu rồi?</h1>
      <p className="mb-6 mt-1 text-center font-semibold text-ink-500">Chọn điểm bắt đầu phù hợp. Bạn có thể đổi lại trong Cài đặt bất cứ lúc nào.</p>
      <div className="flex flex-col gap-3">
        {LEVELS.map((l) => (
          <button key={l.id} type="button" className="option flex items-center gap-4 !py-4" onClick={() => setLevel(l.id)} data-testid={`level-${l.id}`}>
            <span className="text-4xl" aria-hidden>
              {GLYPH[l.id]}
            </span>
            <span>
              <span className="block text-lg font-black text-ink-700">{l.title}</span>
              <span className="block text-sm font-semibold text-ink-500">{l.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-5 text-center text-xs font-bold text-ink-400">Không cần đăng nhập — bạn có thể học ngay. Đăng nhập chỉ để đồng bộ, xếp hạng và lưu chứng chỉ lên đám mây.</p>
      <Footer className="mt-auto" />
    </div>
  );
}
