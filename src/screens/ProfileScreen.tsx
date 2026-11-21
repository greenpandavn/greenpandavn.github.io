import { useRef, useState } from 'react';
import { exportProgress, importProgress, resetProgress, updateProgress, useProgress } from '../lib/store';
import { ACHIEVEMENTS, currentStreak, levelInfo } from '../lib/gamification';
import { countByStatus } from '../lib/srs';
import { hasChineseVoice, speak, ttsSupported } from '../lib/speech';
import StreakCalendar from '../components/StreakCalendar';
import ProgressBar from '../components/ProgressBar';
import Panda from '../components/Panda';
import { BadgeGlyph, Bolt, Flame, Gem, Star } from '../components/Icons';
import { CORE_LESSONS } from '../data';

const BADGE_COLORS = ['bg-leaf-500', 'bg-sky-500', 'bg-grape-500', 'bg-[#ff9600]', 'bg-coral-500', 'bg-sun-500'];

export default function ProfileScreen() {
  const p = useProgress();
  const lv = levelInfo(p.xp);
  const counts = countByStatus(p);
  const streak = currentStreak(p);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const done = CORE_LESSONS.filter((l) => p.lessons[l.id]?.completed).length;
  const setSetting = <K extends keyof typeof p.settings>(k: K, v: (typeof p.settings)[K]) =>
    updateProgress((pp) => ({ ...pp, settings: { ...pp.settings, [k]: v } }));

  const doExport = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoc-tieng-trung-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Đã xuất tiến độ ra tệp JSON.');
  };

  const doImport = async (f: File) => {
    try {
      importProgress(await f.text());
      setMsg('Nhập tiến độ thành công!');
    } catch {
      setMsg('Tệp không hợp lệ. Hãy chọn tệp JSON đã xuất từ ứng dụng.');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <div className="mb-4 flex items-center gap-4">
        <div className="rounded-full bg-leaf-50 p-1">
          <Panda size={84} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black">Hồ sơ của bạn</h1>
          <div className="font-extrabold text-leaf-600">Cấp độ {lv.level}</div>
          <ProgressBar value={lv.pct} className="mt-1 !h-3" />
          <div className="mt-1 text-xs font-bold text-ink-400">
            {p.xp - lv.start}/{lv.next - lv.start} XP để lên cấp {lv.level + 1}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatBox icon={<Flame size={26} />} value={streak} label="Ngày liên tiếp" />
        <StatBox icon={<Bolt size={26} />} value={p.xp} label="Tổng XP" />
        <StatBox icon={<Gem size={24} />} value={p.gems} label="Đá quý" />
        <StatBox icon={<Star size={26} />} value={`${done}/${CORE_LESSONS.length}`} label="Bài đã học" />
      </div>
      <div className="card mb-5 flex justify-around text-center">
        <div>
          <div className="text-xl font-black text-sky-600">{counts.learning}</div>
          <div className="text-xs font-bold text-ink-400">Đang học</div>
        </div>
        <div>
          <div className="text-xl font-black text-sun-600">{counts.mastered}</div>
          <div className="text-xs font-bold text-ink-400">Đã thuộc</div>
        </div>
        <div>
          <div className="text-xl font-black text-ink-500">{p.streak.longest}</div>
          <div className="text-xs font-bold text-ink-400">Chuỗi dài nhất</div>
        </div>
      </div>

      <h2 className="mb-2 text-lg font-black">Lịch học tập</h2>
      <StreakCalendar days={p.days} goal={p.settings.dailyGoal} />

      <h2 className="mb-2 mt-6 text-lg font-black">Huy hiệu</h2>
      <div className="grid grid-cols-3 gap-3">
        {ACHIEVEMENTS.map((a, i) => {
          const got = !!p.achievements[a.id];
          return (
            <div key={a.id} className={`card flex flex-col items-center !p-2 text-center ${got ? '' : 'opacity-50'}`} title={a.desc}>
              <span className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full ${got ? BADGE_COLORS[i % BADGE_COLORS.length] : 'bg-cloud'}`}>
                <BadgeGlyph name={a.icon} size={26} color={got ? '#fff' : '#afafaf'} />
              </span>
              <span className="text-xs font-extrabold leading-tight">{a.title}</span>
              <span className="mt-0.5 text-[10px] font-semibold leading-tight text-ink-400">{a.desc}</span>
            </div>
          );
        })}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-black">Cài đặt</h2>
      <div className="card flex flex-col gap-4">
        <div>
          <div className="mb-2 font-extrabold">Mục tiêu XP mỗi ngày</div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 30, 50].map((g) => (
              <button key={g} type="button" className={`chip ${p.settings.dailyGoal === g ? 'chip-active' : ''}`} onClick={() => setSetting('dailyGoal', g)}>
                {g} XP
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between font-extrabold">
            <span>Tốc độ đọc</span>
            <button type="button" className="chip" onClick={() => speak('你好，我是熊猫。')}>
              Nghe thử
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              [0.6, 'Chậm'],
              [0.8, 'Vừa'],
              [1, 'Nhanh'],
            ].map(([r, label]) => (
              <button key={r} type="button" className={`chip ${p.settings.rate === r ? 'chip-active' : ''}`} onClick={() => setSetting('rate', r as number)}>
                {label}
              </button>
            ))}
          </div>
          {(!ttsSupported() || !hasChineseVoice()) && (
            <p className="mt-2 text-xs font-bold text-coral-500">
              Không tìm thấy giọng đọc tiếng Trung trên thiết bị. Hãy cài giọng “Chinese (China)” trong cài đặt hệ thống hoặc dùng Chrome.
            </p>
          )}
        </div>
        <Toggle label="Âm thanh hiệu ứng" checked={p.settings.sound} onChange={(v) => setSetting('sound', v)} />
        <Toggle label="Bài tập luyện nói (nếu trình duyệt hỗ trợ)" checked={p.settings.speaking} onChange={(v) => setSetting('speaking', v)} />
      </div>

      <h2 className="mb-2 mt-6 text-lg font-black">Sao lưu tiến độ</h2>
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink-500">Tiến độ được lưu trên trình duyệt này. Xuất ra tệp để chuyển sang thiết bị khác.</p>
        <button type="button" className="btn-blue" onClick={doExport}>
          Xuất tiến độ (JSON)
        </button>
        <button type="button" className="btn-white" onClick={() => fileRef.current?.click()}>
          Nhập tiến độ
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="import-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="text-sm font-extrabold text-coral-500 underline"
          onClick={() => {
            if (confirm('Xóa toàn bộ tiến độ? Không thể hoàn tác.')) {
              resetProgress();
              setMsg('Đã xóa tiến độ.');
            }
          }}
        >
          Xóa toàn bộ tiến độ
        </button>
        {msg && <p className="text-center text-sm font-bold text-leaf-600">{msg}</p>}
      </div>
      <p className="mt-6 text-center text-xs font-semibold text-ink-300">
        Ứng dụng miễn phí, mã nguồn mở. Nét chữ: HanziWriter (MIT) · Dữ liệu nét: Make Me a Hanzi (Arphic PL).
      </p>
    </div>
  );
}

const StatBox = ({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) => (
  <div className="card flex items-center gap-3 !p-3">
    {icon}
    <div>
      <div className="text-xl font-black leading-none">{value}</div>
      <div className="text-xs font-bold text-ink-400">{label}</div>
    </div>
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 font-extrabold">
    <span>{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-leaf-500' : 'bg-cloud'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  </label>
);
