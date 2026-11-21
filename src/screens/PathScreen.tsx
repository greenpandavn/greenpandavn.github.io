import { useState } from 'react';
import { CORE_LESSONS, LESSONS, UNITS } from '../data';
import type { Lesson } from '../types';
import { spendGems, updateProgress, useProgress } from '../lib/store';
import { todayXp } from '../lib/gamification';
import { Trophy } from '../components/Icons';
import Panda from '../components/Panda';
import ProgressBar from '../components/ProgressBar';
import { Check, Gem, Gift, Lock, Star, Bolt } from '../components/Icons';

const UNIT_COLORS: Record<string, { bg: string; shadow: string; text: string }> = {
  leaf: { bg: 'bg-leaf-500', shadow: '#46a302', text: 'text-leaf-600' },
  sky: { bg: 'bg-sky-500', shadow: '#1899d6', text: 'text-sky-600' },
  grape: { bg: 'bg-grape-500', shadow: '#a560e8', text: 'text-grape-600' },
};

const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

const NODE_GLYPH: Record<string, string> = {
  wave: '你好', id: '我', numbers: '一二', shop: '钱', family: '家', food: '吃', colors: '红', calendar: '天',
  clock: '点', school: '书', animals: '猫', home: '桌', question: '谁', travel: '去', weather: '雨',
  bonusfood: '饺', bonusbody: '手',
};

export default function PathScreen({ onStart, onTest }: { onStart: (lessonId: string) => void; onTest: (unit: number) => void }) {
  const p = useProgress();
  const [open, setOpen] = useState<string | null>(null);
  const isDone = (l: Lesson) => (p.lessons[l.id]?.completed ?? 0) > 0;
  const coreIndex = (l: Lesson) => CORE_LESSONS.findIndex((c) => c.id === l.id);
  const isUnlocked = (l: Lesson) => {
    if (l.bonus) return p.unlockedBonus.includes(l.id);
    const i = coreIndex(l);
    return i === 0 || isDone(CORE_LESSONS[i - 1]);
  };
  const currentId = CORE_LESSONS.find((l) => !isDone(l) && isUnlocked(l))?.id;
  const goal = p.settings.dailyGoal;
  const txp = todayXp(p);

  return (
    <div className="mx-auto max-w-md px-4 pb-2 pt-4">
      <div className="card mb-6 flex items-center gap-3">
        <Bolt size={34} />
        <div className="flex-1">
          <div className="flex justify-between text-sm font-extrabold">
            <span>Mục tiêu hôm nay</span>
            <span className="text-sun-600">
              {Math.min(txp, goal)}/{goal} XP
            </span>
          </div>
          <ProgressBar value={txp / goal} color="bg-sun-500" className="mt-1 !h-3" />
        </div>
      </div>

      {UNITS.map((u) => {
        const color = UNIT_COLORS[u.color];
        const lessons = LESSONS.filter((l) => l.unit === u.unit).sort((a, b) => Number(!!a.bonus) - Number(!!b.bonus));
        return (
          <section key={u.unit} className="mb-8">
            <div className={`${color.bg} mb-6 rounded-2xl px-4 py-3 text-white`} style={{ boxShadow: `0 4px 0 ${color.shadow}` }}>
              <h2 className="text-lg font-black">{u.title}</h2>
              <p className="text-sm font-bold opacity-90">{u.desc}</p>
            </div>
            <div className="relative flex flex-col items-center gap-5">
              {lessons.map((l, i) => {
                const done = isDone(l);
                const unlocked = isUnlocked(l);
                const current = l.id === currentId;
                const off = OFFSETS[(i + u.unit * 2) % OFFSETS.length];
                return (
                  <div key={l.id} className={`relative flex flex-col items-center ${open === l.id ? 'z-30' : 'z-0'}`} style={{ transform: `translateX(${off}px)` }}>
                    {current && (
                      <div className="absolute -top-9 z-10 animate-bounceSoft whitespace-nowrap rounded-xl border-2 border-cloud bg-white px-3 py-1 text-sm font-black uppercase text-leaf-600">
                        Bắt đầu
                        <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-cloud bg-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      data-testid={`node-${l.id}`}
                      aria-label={`${l.title}${done ? ' (đã hoàn thành)' : unlocked ? '' : ' (đã khóa)'}`}
                      onClick={() => setOpen(open === l.id ? null : l.id)}
                      className={`btn-3d relative flex h-[72px] w-[78px] items-center justify-center rounded-[50%] text-white ${
                        l.bonus
                          ? unlocked
                            ? 'bg-grape-500'
                            : 'bg-cloud'
                          : done
                            ? 'bg-sun-500'
                            : unlocked
                              ? color.bg
                              : 'bg-cloud'
                      } ${current ? 'ring-[6px] ring-leaf-100' : ''}`}
                      style={{
                        boxShadow: `0 7px 0 ${
                          l.bonus ? (unlocked ? '#a560e8' : '#c4c4c4') : done ? '#e5a800' : unlocked ? color.shadow : '#c4c4c4'
                        }`,
                      }}
                    >
                      {l.bonus && !unlocked ? (
                        <Gift size={38} />
                      ) : !unlocked ? (
                        <Lock size={30} className="text-ink-300" />
                      ) : done ? (
                        <span className="relative">
                          <span className="font-han text-2xl font-black">{NODE_GLYPH[l.icon]}</span>
                          <Check size={18} className="absolute -bottom-3 -right-4 rounded-full bg-white p-0.5 text-sun-600" />
                        </span>
                      ) : (
                        <span className="font-han text-2xl font-black">{NODE_GLYPH[l.icon]}</span>
                      )}
                    </button>
                    <div className="mt-3 max-w-[140px] text-center text-xs font-extrabold text-ink-500">{l.title}</div>
                    {current && (
                      <Panda size={74} className={`absolute top-0 ${off >= 0 ? '-left-[96px]' : '-right-[96px]'}`} mood="happy" />
                    )}
                    {open === l.id && (
                      <LessonPopover
                        lesson={l}
                        done={done}
                        unlocked={unlocked}
                        gems={p.gems}
                        offset={off}
                        onStart={() => onStart(l.id)}
                        onUnlock={() => {
                          if (l.cost && spendGems(l.cost)) updateProgress((pp) => ({ ...pp, unlockedBonus: [...pp.unlockedBonus, l.id] }));
                        }}
                      />
                    )}
                  </div>
                );
              })}
              <TestNode
                unit={u.unit}
                title={u.title}
                unlocked={CORE_LESSONS.filter((l) => l.unit === u.unit).every(isDone)}
                cert={p.certificates.find((c) => c.unit === u.unit)?.score}
                open={open === `test-${u.unit}`}
                onToggle={() => setOpen(open === `test-${u.unit}` ? null : `test-${u.unit}`)}
                onStart={() => onTest(u.unit)}
              />
            </div>
          </section>
        );
      })}
      <div className="flex flex-col items-center gap-2 pb-4 text-center">
        <Star size={40} />
        <p className="font-extrabold text-ink-400">Hoàn thành 15 bài để tốt nghiệp HSK 1!</p>
      </div>
    </div>
  );
}

function LessonPopover({
  lesson,
  done,
  unlocked,
  gems,
  offset,
  onStart,
  onUnlock,
}: {
  lesson: Lesson;
  done: boolean;
  unlocked: boolean;
  gems: number;
  offset: number;
  onStart: () => void;
  onUnlock: () => void;
}) {
  return (
    <div
      className="absolute top-[108px] z-20 w-[280px] animate-pop rounded-2xl border-2 border-cloud bg-white p-4 text-left shadow-lg"
      style={{ transform: `translateX(${-offset}px)` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-lg font-black text-ink-700">{lesson.title}</div>
      <div className="mb-1 text-sm font-semibold text-ink-500">{lesson.desc}</div>
      <div className="mb-3 font-han text-sm text-ink-400">
        {lesson.words.length} từ: {lesson.words.slice(0, 6).map((w) => w.hanzi).join('、')}…
      </div>
      {unlocked ? (
        <button type="button" className={done ? 'btn-white' : 'btn-green'} onClick={onStart} data-testid="start-lesson">
          {done ? 'Ôn lại (+XP)' : 'Bắt đầu'}
        </button>
      ) : lesson.bonus ? (
        <button
          type="button"
          className={gems >= (lesson.cost ?? 0) ? 'btn-blue' : 'btn-disabled'}
          disabled={gems < (lesson.cost ?? 0)}
          onClick={onUnlock}
        >
          Mở khóa · <Gem size={20} className="mx-1" /> {lesson.cost}
        </button>
      ) : (
        <div className="rounded-xl bg-cloud px-3 py-3 text-center text-sm font-extrabold text-ink-400">Hoàn thành bài trước để mở khóa</div>
      )}
    </div>
  );
}

function TestNode({ unit, title, unlocked, cert, open, onToggle, onStart }: {
  unit: number; title: string; unlocked: boolean; cert?: number; open: boolean; onToggle: () => void; onStart: () => void;
}) {
  return (
    <div className={`relative mt-2 flex flex-col items-center ${open ? 'z-30' : 'z-0'}`}>
      <button
        type="button"
        data-testid={`test-node-${unit}`}
        aria-label={`Bài kiểm tra ${title}${unlocked ? '' : ' (đã khóa)'}`}
        onClick={onToggle}
        className={`btn-3d flex h-[84px] w-[84px] items-center justify-center rounded-3xl ${cert ? 'bg-sun-500 text-white' : unlocked ? 'bg-[#ff9600] text-white' : 'bg-cloud text-ink-300'}`}
        style={{ boxShadow: `0 7px 0 ${cert ? '#e5a800' : unlocked ? '#d87f00' : '#c4c4c4'}` }}
      >
        <Trophy size={44} />
      </button>
      <div className="mt-3 text-center text-xs font-extrabold text-ink-500">
        Kiểm tra cuối phần{cert ? ` · ${cert}%` : ''}
      </div>
      {open && (
        <div className="absolute top-[118px] z-20 w-72 animate-pop rounded-2xl border-2 border-cloud bg-white p-4 shadow-xl">
          <div className="text-lg font-black text-ink-700">Kiểm tra: {title}</div>
          <p className="mb-3 text-sm font-semibold text-ink-500">10 câu hỏi (nghe, nghĩa, pinyin, sắp xếp câu). Đạt từ 80% để nhận chứng chỉ.</p>
          {unlocked ? (
            <button type="button" className="btn-green" onClick={onStart} data-testid="start-test">
              {cert ? 'Thi lại' : 'Làm bài kiểm tra'}
            </button>
          ) : (
            <div className="rounded-xl bg-cloud px-3 py-3 text-center text-sm font-extrabold text-ink-400">Hoàn thành tất cả bài của phần này để mở khóa</div>
          )}
        </div>
      )}
    </div>
  );
}
