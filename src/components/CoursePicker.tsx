import { COURSES, getCourse, setCourse, useContentVersion } from '../data';
import { xpByCourse, useProgress } from '../lib/store';
import Panda from './Panda';
import Footer from './Footer';

/** The two course cards ('Tiếng Trung' / 'Tiếng Anh'); used on the home screen and on first launch. */
export function CourseCards({ compact = false, highlight = true }: { compact?: boolean; highlight?: boolean }) {
  useContentVersion();
  useProgress();
  const xp = xpByCourse();
  const cur = getCourse();
  return (
    <div className={compact ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-3'} data-testid="course-picker">
      {COURSES.map((c) => {
        const active = highlight && c.id === cur;
        return (
          <button
            key={c.id}
            type="button"
            data-testid={`course-${c.id}`}
            aria-pressed={active}
            onClick={() => setCourse(c.id)}
            className={`option flex items-center gap-3 text-left ${compact ? '!px-3 !py-2' : '!py-4'} ${active ? 'option-selected' : ''}`}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-xl bg-coral-500 font-han font-black text-sun-400 ${compact ? 'h-9 w-9 text-base' : 'h-14 w-14 text-2xl'}`}
              aria-hidden
            >
              {c.glyph}
            </span>
            <span className="min-w-0">
              <span className={`block font-black text-ink-700 ${compact ? 'text-[15px] leading-tight' : 'text-lg'}`}>{c.label}</span>
              <span className="block text-xs font-bold text-ink-400">{compact ? `${xp[c.id]} XP` : c.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** First launch: choose what to learn. */
export default function CoursePicker() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-10" data-testid="course-picker-screen">
      <Panda size={110} mood="happy" className="mx-auto" />
      <h1 className="mt-3 text-center text-2xl font-black">Bạn muốn học ngôn ngữ nào?</h1>
      <p className="mb-6 mt-1 text-center font-semibold text-ink-500">Tiến độ của mỗi khóa được lưu riêng. Bạn có thể đổi khóa học bất cứ lúc nào ở góc trên bên trái.</p>
      <CourseCards highlight={false} />
      <p className="mt-5 text-center text-xs font-bold text-ink-400">Không cần đăng nhập — bạn có thể học ngay cả hai khóa.</p>
      <Footer className="mt-auto" />
    </div>
  );
}
