import { useAccount, visibleCerts } from '../lib/account';
import { useEffect, useRef, useState } from 'react';
import { CORE_LESSONS, LESSONS, UNITS, getCourse, isEnglish, isRoman, levelLabel, loadUnits, useContentVersion } from '../data';
import { CourseCards } from '../components/CoursePicker';
import { currentLessonId, isDone as lessonDone, isTestUnlocked, isUnlocked as lessonUnlocked } from '../lib/unlock';
import type { Lesson } from '../types';
import { spendGems, updateProgress, useProgress } from '../lib/store';
import { todayXp } from '../lib/gamification';
import { Trophy } from '../components/Icons';
import Panda from '../components/Panda';
import ProgressBar from '../components/ProgressBar';
import { levelAllVip, partVip, useVip, useVipParts } from '../lib/vip';
import { firebaseConfigured } from '../lib/firebaseConfig';
import { Check, Gem, Gift, Lock, Star, Bolt } from '../components/Icons';

const UNIT_COLORS: Record<string, { bg: string; shadow: string; text: string }> = {
  leaf: { bg: 'bg-leaf-500', shadow: 'rgb(var(--leaf-600))', text: 'text-leaf-600' },
  sky: { bg: 'bg-sky-500', shadow: '#1899d6', text: 'text-sky-600' },
  grape: { bg: 'bg-grape-500', shadow: '#a560e8', text: 'text-grape-600' },
  coral: { bg: 'bg-coral-500', shadow: '#d93a3a', text: 'text-coral-600' },
};

const UNIT_KEYS = Object.keys(UNIT_COLORS);

const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

const NODE_GLYPH: Record<string, string> = {
  wave: '你好', id: '我', numbers: '一二', shop: '钱', family: '家', food: '吃', colors: '红', calendar: '天',
  clock: '点', school: '书', animals: '猫', home: '桌', question: '谁', travel: '去', weather: '雨',
  bonusfood: '饺', bonusbody: '手',
};

export default function PathScreen({ onStart, onTest, onMock, onGame }: { onStart: (lessonId: string) => void; onTest: (unit: number) => void; onMock: (target?: string) => void; onGame: () => void }) {
  const p = useProgress();
  useContentVersion();
  const en = isEnglish();
  const acc = useAccount();
  const [open, setOpen] = useState<string | null>(null);
  const isDone = (l: Lesson) => lessonDone(p, l);
  const isUnlocked = (l: Lesson) => lessonUnlocked(p, l);
  const vip = useVip();
  useVipParts();
  const vipLevel = (lv: number) => firebaseConfigured && levelAllVip(getCourse(), lv);
  const vipPart = (unit: number) => firebaseConfigured && partVip(getCourse(), unit);
  const currentId = currentLessonId(p);
  const scrolled = useRef(false);
  useEffect(() => {
    // "Biết sơ sơ" starts at Part 2: bring the current lesson into view once.
    if (scrolled.current || !currentId || currentId === CORE_LESSONS[0]?.id) return;
    if (!document.querySelector(`[data-testid="node-${currentId}"]`)) return;
    scrolled.current = true;
    document.querySelector(`[data-testid="node-${currentId}"]`)?.scrollIntoView({ block: 'center' });
  }, [currentId]);
  const goal = p.settings.dailyGoal;
  const txp = todayXp(p);
  const levels = [...new Set(UNITS.map((u) => u.level ?? 1))];

  return (
    <div className="mx-auto max-w-md px-4 pb-2 pt-4" key={getCourse()}>
      <div className="mb-3">
        <CourseCards compact />
      </div>
      <div className="card mb-4 flex items-center gap-3">
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

      {(
        <button type="button" className="card mb-4 flex w-full items-center gap-3 text-left" onClick={() => onMock()} data-testid="open-mock">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-600">
            <Trophy size={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-ink-700">{{ zh: 'Thi thử HSK', en: 'Thi thử tiếng Anh', ko: 'Thi thử TOPIK', ja: 'Thi thử JLPT', th: 'Thi thử tiếng Thái' }[getCourse()]}</span>
            <span className="block text-xs font-bold text-ink-400">Đề dài, tính giờ như thi thật · không bắt buộc</span>
          </span>
          <span className="text-xl font-black text-ink-300" aria-hidden>
            ›
          </span>
        </button>
      )}
      {en &&
        [
          { id: 'placement', icon: '🎯', title: 'Kiểm tra trình độ đầu vào', sub: 'Khoảng 40 câu · xếp trình độ A1–C1 trước khi học' },
          { id: 'listening', icon: '🎧', title: 'Luyện nghe tiếng Anh', sub: 'Bài nghe ngắn theo từng Phần · nghe và chọn đáp án' },
        ].map((x) => (
          <button key={x.id} type="button" className="card mb-4 flex w-full items-center gap-3 text-left" onClick={() => onMock(x.id)} data-testid={`open-${x.id}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-2xl" aria-hidden>
              {x.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-black text-ink-700">{x.title}</span>
              <span className="block text-xs font-bold text-ink-400">{x.sub}</span>
            </span>
            <span className="text-xl font-black text-ink-300" aria-hidden>
              ›
            </span>
          </button>
        ))}
      <button type="button" className="card mb-4 flex w-full items-center gap-3 text-left" onClick={onGame} data-testid="open-game">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-leaf-100 text-2xl" aria-hidden>
          🎮
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-black text-ink-700">Trò chơi</span>
          <span className="block text-xs font-bold text-ink-400">Đúng hay Sai · 10 câu, 60 giây · +10 XP mỗi câu đúng</span>
        </span>
        <span className="text-xl font-black text-ink-300" aria-hidden>
          ›
        </span>
      </button>
      {levels.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2" data-testid="level-nav">
          <span className="text-xs font-extrabold uppercase text-ink-400">Cấp độ:</span>
          {levels.map((lv) => (
            <button
              key={lv}
              type="button"
              className="chip"
              data-testid={`level-jump-${lv}`}
              onClick={() => document.getElementById(`level-${lv}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {levelLabel(lv)}
              {vipLevel(lv) && !vip && <Lock size={12} className="ml-1 inline text-sun-500" />}
            </button>
          ))}
        </div>
      )}
      {UNITS.map((u, ui) => {
        const level = u.level ?? 1;
        const firstOfLevel = levels.length > 1 && (ui === 0 || (UNITS[ui - 1].level ?? 1) !== level);
        const levelLessons = CORE_LESSONS.filter((l) => (UNITS.find((x) => x.unit === l.unit)?.level ?? 1) === level);
        const color = UNIT_COLORS[u.color] ?? UNIT_COLORS[UNIT_KEYS[(u.unit - 1) % UNIT_KEYS.length]];
        const lessons = LESSONS.filter((l) => l.unit === u.unit).sort((a, b) => Number(!!a.bonus) - Number(!!b.bonus));
        return (
          <section key={u.unit} className="mb-8">
            {firstOfLevel && (
              <div id={`level-${level}`} className="mb-4 flex scroll-mt-16 items-center gap-3" data-testid={`level-${level}`}>
                <span className="rounded-xl bg-ink-700 px-3 py-1 font-black text-white">{levelLabel(level)}</span>
                {vipLevel(level) && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-sun-400 px-2 py-0.5 text-xs font-black text-white" data-testid={`level-vip-${level}`}>
                    {!vip && <Lock size={12} />} VIP
                  </span>
                )}
                <span className="text-sm font-extrabold text-ink-500">
                  {levelLessons.filter((l) => isDone(l)).length}/{levelLessons.length} bài · {levelLessons.reduce((n, l) => n + l.wordCount, 0)} từ
                </span>
                <span className="h-0.5 flex-1 rounded bg-cloud" />
              </div>
            )}
            <div className={`${color.bg} mb-6 rounded-2xl px-4 py-3 text-white`} style={{ boxShadow: `0 4px 0 ${color.shadow}` }}>
              <h2 className="text-lg font-black">
                {u.title}
                {vipPart(u.unit) && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-lg bg-sun-400 px-2 py-0.5 align-middle text-xs font-black text-white" data-testid={`part-vip-${u.unit}`}>
                    {!vip && <Lock size={12} />} VIP
                  </span>
                )}
              </h2>
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
                          <span className="font-han text-2xl font-black">{NODE_GLYPH[l.icon] ?? (l.icon || l.words[0]?.hanzi || '?').slice(0, 2)}</span>
                          <Check size={18} className="absolute -bottom-3 -right-4 rounded-full bg-white p-0.5 text-sun-600" />
                        </span>
                      ) : (
                        <span className="font-han text-2xl font-black">{NODE_GLYPH[l.icon] ?? (l.icon || l.words[0]?.hanzi || '?').slice(0, 2)}</span>
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
                unlocked={isTestUnlocked(p, u.unit)}
                cert={visibleCerts(p.certificates, acc.revoked).find((c) => c.unit === u.unit)?.score}
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
        <p className="font-extrabold text-ink-400">Hoàn thành {CORE_LESSONS.length} bài để tốt nghiệp!</p>
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
  // the words of the part are fetched as soon as the card opens, so that the lesson starts without a wait
  useEffect(() => void loadUnits([lesson.unit]).catch(() => {}), [lesson.unit]);
  return (
    <div
      className="absolute top-[108px] z-20 w-[280px] animate-pop rounded-2xl border-2 border-cloud bg-white p-4 text-left shadow-lg"
      style={{ transform: `translateX(${-offset}px)` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-lg font-black text-ink-700">{lesson.title}</div>
      <div className="mb-1 min-h-5 text-sm font-semibold text-ink-500">{lesson.desc}</div>
      <div className="mb-3 font-han text-sm text-ink-400">
        {lesson.wordCount} từ{lesson.words.length > 0 && `: ${lesson.words.slice(0, 6).map((w) => w.hanzi).join(lesson.words[0]?.pinyin ? '、' : ', ')}…`}
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
          <p className="mb-3 text-sm font-semibold text-ink-500">10 câu hỏi (nghe, nghĩa, {isEnglish() ? 'chính tả' : isRoman() ? 'phiên âm' : 'pinyin'}, sắp xếp câu). Đạt từ 80% để nhận chứng chỉ.</p>
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
