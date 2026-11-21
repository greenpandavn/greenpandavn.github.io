import { useProgress } from '../lib/store';
import { currentStreak, todayXp } from '../lib/gamification';
import { Bolt, Flame, Gem } from './Icons';

export default function TopBar() {
  const p = useProgress();
  const streak = currentStreak(p);
  const xp = todayXp(p);
  const goal = p.settings.dailyGoal;
  return (
    <header className="sticky top-0 z-30 border-b-2 border-cloud bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2" title="Khóa học HSK 1">
          <span className="flex h-8 w-11 items-center justify-center rounded-lg bg-coral-500 font-han text-sm font-black text-sun-400 shadow-[0_3px_0_#d93a3a]">
            中文
          </span>
        </div>
        <div className="flex items-center gap-4 font-extrabold">
          <span className={`flex items-center gap-1 ${streak ? 'text-[#ff9600]' : 'text-ink-300'}`} title="Chuỗi ngày học" data-testid="streak">
            <Flame size={24} style={streak ? undefined : { filter: 'grayscale(1)', opacity: 0.5 }} />
            {streak}
          </span>
          <span className="flex items-center gap-1 text-sky-500" title="Đá quý" data-testid="gems">
            <Gem size={22} />
            {p.gems}
          </span>
          <span className="flex items-center gap-1 text-sun-600" title="XP hôm nay / mục tiêu" data-testid="today-xp">
            <Bolt size={22} />
            {xp}/{goal}
          </span>
        </div>
      </div>
    </header>
  );
}
