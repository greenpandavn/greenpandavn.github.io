import { VERSION_LABEL } from '../lib/version';
import { useRef, useState } from 'react';
import type { Certificate } from '../types';
import { firebaseConfigured, loadCloud, useAccount, visibleCerts } from '../lib/account';
import { NOT_CONFIGURED_MSG } from '../lib/firebaseConfig';
import { notifyPermission, notifySupported, requestNotify } from '../lib/reminder';
import { installHelp, promptInstall, useInstall } from '../lib/install';
import { shareText } from '../lib/share';
import ShareButton from '../components/ShareButton';
import CertificateView from '../components/CertificateView';
import { CONTACT_EMAIL, YOUTUBE_URL } from '../components/Footer';
import { Trophy } from '../components/Icons';
import { exportProgress, importProgress, resetProgress, updateProgress, useProgress, xpByCourse } from '../lib/store';
import { achievements, currentStreak, levelInfo } from '../lib/gamification';
import { countByStatus } from '../lib/srs';
import { hasChineseVoice, hasEnglishVoice, speak, ttsSupported } from '../lib/speech';
import StreakCalendar from '../components/StreakCalendar';
import ProgressBar from '../components/ProgressBar';
import Panda from '../components/Panda';
import { BadgeGlyph, Bolt, Flame, Gem, Star } from '../components/Icons';
import { COURSES, CORE_LESSONS, courseInfo, isEnglish, setCourse, useContentVersion } from '../data';
import { LEVELS, setLevel } from '../lib/unlock';
import { THEMES } from '../lib/theme';

const BADGE_COLORS = ['bg-leaf-500', 'bg-sky-500', 'bg-grape-500', 'bg-[#ff9600]', 'bg-coral-500', 'bg-sun-500'];

export default function ProfileScreen({ onLogin, onAdmin }: { onLogin: () => void; onAdmin: () => void }) {
  const p = useProgress();
  useContentVersion();
  const acc = useAccount();
  const certs = visibleCerts(p.certificates, acc.revoked);
  const inst = useInstall();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [perm, setPerm] = useState(notifyPermission());
  const [editing, setEditing] = useState(false);
  const displayName = acc.user?.displayName || p.settings.name || 'Học viên Gấu Trúc';
  const [nameDraft, setNameDraft] = useState(displayName);
  const saveName = async () => {
    const n = nameDraft.trim().slice(0, 40);
    if (!n) return;
    setEditing(false);
    if (acc.user) {
      try {
        await (await loadCloud()).setDisplayName(n);
        setMsg('');
      } catch {
        setMsg('Chưa đổi được tên. Hãy thử lại khi có mạng.');
      }
    } else setSetting('name', n);
  };
  const logout = async () => {
    await (await loadCloud()).logout();
  };
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
    <div className="mx-auto max-w-md px-4 pb-2 pt-4">
      <div className="mb-4 flex items-center gap-4">
        <div className="shrink-0 rounded-full bg-leaf-50 p-1">
          <Panda size={84} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void saveName();
              }}
            >
              <input className="input !min-h-[40px] min-w-0 !px-3" value={nameDraft} maxLength={40} onChange={(e) => setNameDraft(e.target.value)} autoFocus aria-label="Tên hiển thị" />
              <button type="submit" className="chip !text-leaf-600">
                Lưu
              </button>
            </form>
          ) : (
            <h1 className="flex min-w-0 items-center gap-2 text-2xl font-black">
              <span className="min-w-0 truncate" data-testid="profile-name">
                {displayName}
              </span>
              <button
                type="button"
                className="shrink-0 text-xs font-extrabold text-sky-600 underline"
                onClick={() => {
                  setNameDraft(displayName);
                  setEditing(true);
                }}
              >
                Sửa
              </button>
            </h1>
          )}
          <div className="font-extrabold text-leaf-600">Cấp độ {lv.level}</div>
          <ProgressBar value={lv.pct} className="mt-1 !h-3" />
          <div className="mt-1 text-xs font-bold text-ink-400">
            {p.xp - lv.start}/{lv.next - lv.start} XP để lên cấp {lv.level + 1}
          </div>
        </div>
      </div>

      <div className="card mb-4 flex flex-col gap-2" data-testid="account-card">
        {acc.user ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-ink-700">{acc.user.email ?? 'Tài khoản Google'}</div>
                <div className="text-xs font-bold text-ink-400">
                  {acc.user.provider === 'google.com' ? 'Đăng nhập bằng Google' : 'Đăng nhập bằng email'} ·{' '}
                  <span className={acc.sync === 'error' ? 'text-coral-500' : acc.sync === 'offline' ? 'text-[#ff9600]' : 'text-leaf-600'} data-testid="sync-status">
                    {SYNC_LABEL[acc.sync]}
                  </span>
                </div>
              </div>
              <button type="button" className="chip !text-coral-500" onClick={() => void logout()} data-testid="logout">
                Đăng xuất
              </button>
            </div>
            {acc.migrated && <p className="text-xs font-bold text-leaf-600">Đã gộp tiến độ trên máy này vào tài khoản.</p>}
          </>
        ) : (
          <>
            {firebaseConfigured ? (
              <>
                <p className="text-sm font-bold text-ink-500">
                  {acc.ready ? 'Bạn đang học không cần tài khoản. Đăng nhập để lưu tiến độ lên đám mây và lên bảng xếp hạng.' : 'Đang kiểm tra tài khoản…'}
                </p>
                <button type="button" className="btn-green" onClick={onLogin} data-testid="open-auth">
                  Đăng nhập / Đăng ký
                </button>
              </>
            ) : (
              <p className="text-sm font-bold text-ink-500" data-testid="firebase-not-configured">
                <b className="text-ink-700">Chưa cấu hình Firebase.</b> {NOT_CONFIGURED_MSG}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatBox icon={<Flame size={26} />} value={streak} label="Ngày liên tiếp" />
        <StatBox icon={<Bolt size={26} />} value={p.xp} label={`XP ${courseInfo().label}`} />
        <StatBox icon={<Gem size={24} />} value={p.gems} label="Đá quý" />
        <StatBox icon={<Star size={26} />} value={`${done}/${CORE_LESSONS.length}`} label="Bài đã học" />
      </div>
      <div className="card mb-5" data-testid="course-xp">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-black">XP theo khóa học</h2>
          <span className="text-sm font-extrabold text-sun-600" data-testid="total-xp">
            Tổng: {xpByCourse().total} XP
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COURSES.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`profile-course-${c.id}`}
              onClick={() => setCourse(c.id)}
              className={`option !px-3 !py-2 text-left ${c.id === courseInfo().id ? 'option-selected' : ''}`}
            >
              <span className="block text-[15px] font-black leading-tight text-ink-700">{c.label}</span>
              <span className="block text-xs font-bold text-ink-400">{xpByCourse()[c.id]} XP</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-ink-400">
          Bài học, chuỗi ngày, huy hiệu và chứng chỉ được tính riêng cho từng khóa. Đá quý, tài khoản và bảng xếp hạng (tổng XP của cả hai khóa) dùng chung.
        </p>
      </div>
      {p.mock && Object.keys(p.mock).length > 0 && (
        <div className="card mb-5" data-testid="mock-results">
          <h2 className="mb-2 font-black">Thi thử – điểm cao nhất</h2>
          <div className="flex flex-col gap-1">
            {Object.entries(p.mock)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([lv, r]) => (
                <div key={lv} className="flex items-center justify-between text-sm font-bold" data-testid={`profile-mock-${lv}`}>
                  <span className="font-extrabold text-ink-700">{lv === 'en1' ? 'Tiếng Anh cơ bản' : lv === 'en2' ? 'Tiếng Anh trung cấp' : `HSK ${lv}`}</span>
                  <span className={r.passed ? 'text-leaf-600' : 'text-ink-500'}>
                    {r.best}/{r.max} · {r.passed ? 'Đạt' : 'Chưa đạt'} · {r.attempts} lần thi
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {streak > 0 && <ShareButton text={shareText.streak(streak)} label={`Chia sẻ chuỗi ${streak} ngày`} />}
        {p.xp > 0 && <ShareButton text={shareText.xp(p.xp)} label={`Chia sẻ ${p.xp} XP`} />}
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

      <h2 className="mb-2 mt-6 text-lg font-black">Chứng chỉ của tôi</h2>
      {certs.length === 0 ? (
        <p className="card text-sm font-bold text-ink-400" data-testid="no-certs">
          Chưa có chứng chỉ. Hoàn thành bài kiểm tra cuối mỗi phần (đạt từ 80%) để nhận chứng chỉ.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="cert-list">
          {certs.map((c) => (
            <li key={c.id} className="card flex items-center gap-3 !p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-100 text-sun-600">
                <Trophy size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-extrabold">{c.part}</div>
                <div className="text-xs font-bold text-ink-400">
                  {c.score}% · {c.date.split('-').reverse().join('/')}
                </div>
              </div>
              <button type="button" className="chip !text-sky-600" onClick={() => setCert(c)}>
                Xem
              </button>
            </li>
          ))}
        </ul>
      )}
      {cert && <CertificateView cert={cert} onClose={() => setCert(null)} />}

      <h2 className="mb-2 mt-6 text-lg font-black">Huy hiệu</h2>
      <div className="grid grid-cols-3 gap-3">
        {achievements().map((a, i) => {
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

      {acc.user && acc.role === 'admin' && (
        <button type="button" className="btn-green mt-4 w-full !bg-grape-500" onClick={onAdmin} data-testid="admin-link">
          Trang quản trị
        </button>
      )}

      <h2 className="mb-2 mt-6 text-lg font-black">Cài đặt</h2>
      <div className="card flex flex-col gap-4">
        <div data-testid="level-setting">
          <div className="mb-2 font-extrabold">Trình độ của bạn</div>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" className={`chip !px-1 ${p.settings.level === l.id ? 'chip-active' : ''}`} onClick={() => setLevel(l.id)} data-testid={`set-level-${l.id}`}>
                {l.title}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs font-bold text-ink-400">{LEVELS.find((l) => l.id === p.settings.level)?.desc ?? 'Chưa chọn trình độ.'}</p>
        </div>
        <div data-testid="theme-setting">
          <div className="mb-2 font-extrabold">Màu giao diện</div>
          <div className="flex flex-wrap gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.name}
                aria-label={t.name}
                aria-pressed={p.settings.theme === t.id}
                onClick={() => setSetting('theme', t.id)}
                data-testid={`theme-${t.id}`}
                className={`h-11 w-11 rounded-full border-4 ${p.settings.theme === t.id ? 'border-ink-700' : 'border-transparent'}`}
                style={{ background: t.scale[3], boxShadow: `0 3px 0 ${t.scale[4]}` }}
              />
            ))}
          </div>
          <p className="mt-1 text-xs font-bold text-ink-400">{THEMES.find((t) => t.id === p.settings.theme)?.name}</p>
        </div>
        <Toggle label="Chế độ tối" checked={p.settings.dark} onChange={(v) => setSetting('dark', v)} />
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
            <button type="button" className="chip" onClick={() => speak(isEnglish() ? 'Hello, I am a panda.' : '你好，我是熊猫。')}>
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
          {(!ttsSupported() || !(isEnglish() ? hasEnglishVoice() : hasChineseVoice())) && (
            <p className="mt-2 text-xs font-bold text-coral-500">
              Không tìm thấy giọng đọc {isEnglish() ? 'tiếng Anh' : 'tiếng Trung'} trên thiết bị. Hãy cài giọng {isEnglish() ? '“English (United States)”' : '“Chinese (China)”'} trong cài đặt hệ
              thống hoặc dùng Chrome.
            </p>
          )}
        </div>
        <Toggle label="Âm thanh hiệu ứng" checked={p.settings.sound} onChange={(v) => setSetting('sound', v)} />
        <Toggle label="Bài tập luyện nói (nếu trình duyệt hỗ trợ)" checked={p.settings.speaking} onChange={(v) => setSetting('speaking', v)} />
      </div>

      <h2 className="mb-2 mt-6 text-lg font-black">Nhắc học hằng ngày</h2>
      <div className="card flex flex-col gap-3" data-testid="reminder-card">
        <Toggle label="Nhắc tôi học mỗi ngày" checked={p.settings.reminderOn} onChange={(v) => setSetting('reminderOn', v)} />
        <label className="flex items-center justify-between font-extrabold">
          <span>Giờ nhắc</span>
          <input
            type="time"
            className="input !min-h-[44px] !w-32 !px-3"
            value={p.settings.reminderTime}
            onChange={(e) => e.target.value && setSetting('reminderTime', e.target.value)}
            data-testid="reminder-time"
          />
        </label>
        {perm === 'granted' ? (
          <p className="text-xs font-bold text-leaf-600">Đã bật thông báo. Bạn sẽ nhận nhắc nhở nếu hôm đó chưa học.</p>
        ) : perm === 'denied' || perm === 'unsupported' ? (
          <p className="text-xs font-bold text-[#ff9600]">
            {perm === 'denied' ? 'Thông báo đang bị chặn' : 'Trình duyệt không hỗ trợ thông báo'} — ứng dụng sẽ hiện banner nhắc nhở khi bạn mở app.
          </p>
        ) : (
          notifySupported() && (
            <button type="button" className="btn-blue" onClick={async () => setPerm(await requestNotify())} data-testid="enable-notify">
              Bật thông báo nhắc học
            </button>
          )
        )}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-black">Cài ứng dụng</h2>
      <div className="card flex flex-col gap-2">
        {inst.installed ? (
          <p className="text-sm font-bold text-leaf-600">Ứng dụng đã được cài trên thiết bị này.</p>
        ) : inst.canPrompt ? (
          <button type="button" className="btn-green" onClick={() => void promptInstall()} data-testid="install-profile">
            Thêm vào màn hình chính
          </button>
        ) : (
          <p className="text-sm font-bold text-ink-500">{installHelp()}</p>
        )}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-black">Sao lưu tiến độ</h2>
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink-500">
          {acc.user ? 'Tiến độ được đồng bộ với tài khoản và lưu cả trên trình duyệt này.' : 'Tiến độ được lưu trên trình duyệt này. Đăng nhập hoặc xuất ra tệp để chuyển sang thiết bị khác.'}
        </p>
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
      <h2 className="mb-2 mt-6 text-lg font-black">Giới thiệu / Liên hệ</h2>
      <div className="card flex flex-col gap-1 text-sm font-semibold text-ink-500" data-testid="about">
        <p>
          <b className="text-ink-700">Học Ngoại Ngữ – Gấu Trúc Xanh</b> là ứng dụng học tiếng Trung (HSK) và tiếng Anh (cơ bản, trung cấp) miễn phí cho người Việt.
        </p>
        <p>© 2026 VH Phước — Học Ngoại Ngữ, Gấu Trúc Xanh. Mọi nội dung thuộc về VH Phước.</p>
        <p data-testid="about-version">
          Phiên bản: <b className="text-ink-700">{VERSION_LABEL}</b>
        </p>
        <p>
          Email liên hệ:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-ink-700 underline">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>
          YouTube:{' '}
          <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="font-extrabold text-coral-500 underline">
            youtube.com/@vhphuocmedia
          </a>
        </p>
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

const SYNC_LABEL = { idle: 'Đã kết nối', saving: 'Đang đồng bộ…', saved: 'Đã đồng bộ', offline: 'Ngoại tuyến – sẽ đồng bộ khi có mạng', error: 'Lỗi đồng bộ' } as const;
