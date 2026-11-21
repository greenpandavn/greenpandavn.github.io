import { useState } from 'react';
import { dateKey } from '../lib/date';
import { Chevron } from './Icons';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function StreakCalendar({ days, goal }: { days: Record<string, number>; goal: number }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const today = dateKey();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const active = Object.keys(days).filter((k) => k.startsWith(dateKey(first).slice(0, 7)) && days[k] > 0).length;

  return (
    <div className="rounded-2xl border-2 border-cloud p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="rounded-lg p-2 text-ink-400 hover:bg-cloud" onClick={() => setOffset(offset - 1)} aria-label="Tháng trước">
          <Chevron dir="left" size={18} />
        </button>
        <div className="text-center">
          <div className="font-extrabold text-ink-700">
            Tháng {first.getMonth() + 1}, {first.getFullYear()}
          </div>
          <div className="text-xs font-bold text-ink-400">{active} ngày học</div>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-ink-400 hover:bg-cloud disabled:opacity-30"
          onClick={() => setOffset(offset + 1)}
          disabled={offset >= 0}
          aria-label="Tháng sau"
        >
          <Chevron size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-xs font-extrabold text-ink-300">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = dateKey(new Date(first.getFullYear(), first.getMonth(), d));
          const xp = days[key] ?? 0;
          const met = xp >= goal;
          return (
            <div
              key={i}
              title={xp ? `${xp} XP` : undefined}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${
                met ? 'bg-[#ff9600] text-white' : xp ? 'bg-sun-100 text-[#ff9600]' : 'text-ink-400'
              } ${key === today ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs font-bold text-ink-400">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-[#ff9600]" /> Đạt mục tiêu
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-sun-100" /> Có học
        </span>
      </div>
    </div>
  );
}
