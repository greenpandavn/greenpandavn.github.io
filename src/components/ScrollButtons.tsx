import { useEffect, useState } from 'react';

/** Floating "Lên đầu" / "Xuống cuối" shortcuts for long pages (they stay hidden on pages that barely scroll). */
export default function ScrollButtons({ className = 'bottom-24' }: { className?: string }) {
  const [state, setState] = useState({ up: false, down: false });
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const long = max > window.innerHeight; // more than one extra screen of content
      const up = long && window.scrollY > 400;
      const down = long && window.scrollY < max - 200;
      setState((s) => (s.up === up && s.down === down ? s : { up, down }));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // the page also grows or shrinks without scrolling (tabs, filters, levels that finish loading)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, []);
  if (!state.up && !state.down) return null;
  const go = (top: number) => window.scrollTo({ top, behavior: 'smooth' });
  const button = 'flex items-center gap-1 rounded-full border-2 border-cloud bg-white/95 px-3 py-1.5 text-xs font-extrabold text-ink-500 shadow-md active:translate-y-px';
  return (
    <div className={`pointer-events-none fixed right-3 z-20 flex flex-col items-end gap-2 ${className}`} data-testid="scroll-buttons">
      {state.up && (
        <button className={`pointer-events-auto ${button}`} onClick={() => go(0)} data-testid="scroll-top">
          <span aria-hidden>↑</span> Lên đầu
        </button>
      )}
      {state.down && (
        <button className={`pointer-events-auto ${button}`} onClick={() => go(document.documentElement.scrollHeight)} data-testid="scroll-bottom">
          <span aria-hidden>↓</span> Xuống cuối
        </button>
      )}
    </div>
  );
}
