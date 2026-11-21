import { useEffect, useRef, useState } from 'react';
import { COURSES, courseInfo, setCourse, useContentVersion } from '../data';
import { xpByCourse, useProgress } from '../lib/store';

/** TopBar badge showing the active course; tap it to switch between courses. */
export default function CourseBadge() {
  useContentVersion();
  useProgress();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = courseInfo();
  const xp = xpByCourse();
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={`${cur.title} – nhấn để đổi khóa học`}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="course-badge"
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-coral-500 px-2.5 text-[13px] font-black leading-none text-sun-400 shadow-[0_3px_0_#d93a3a]"
      >
        {cur.label}
        <span aria-hidden className="text-[10px]">
          ▼
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-10 z-40 w-64 animate-pop rounded-2xl border-2 border-cloud bg-white p-2 shadow-lg" data-testid="course-menu">
          <p className="px-2 pb-1 text-xs font-extrabold uppercase text-ink-400">Chọn khóa học</p>
          {COURSES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="menuitem"
              data-testid={`course-switch-${c.id}`}
              onClick={() => {
                setOpen(false);
                if (c.id !== cur.id) {
                  setCourse(c.id);
                  window.scrollTo(0, 0);
                }
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${c.id === cur.id ? 'bg-leaf-50' : 'hover:bg-mist'}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-500 font-han text-lg font-black text-sun-400">{c.glyph}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-black text-ink-700">{c.label}</span>
                <span className="block text-xs font-bold text-ink-400">{xp[c.id]} XP</span>
              </span>
              {c.id === cur.id && <span className="text-sm font-black text-leaf-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
