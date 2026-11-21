import { useEffect, useState } from 'react';
import { useProgress } from '../lib/store';
import { isReminderDue, notifyPermission, REMINDER_TEXT } from '../lib/reminder';
import { isIOS, promptInstall, useInstall } from '../lib/install';
import IosInstallHint from './IosInstallHint';
import { Close } from './Icons';

const DISMISS_KEY = 'hoc-tieng-trung-install-dismissed';

export default function AppBanners({ onLearn }: { onLearn: () => void }) {
  const p = useProgress();
  const inst = useInstall();
  const [now, setNow] = useState(() => new Date());
  const [hideReminder, setHideReminder] = useState(false);
  const [hideInstall, setHideInstall] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const showReminder = !hideReminder && isReminderDue(p, now) && notifyPermission() !== 'granted';
  const ios = isIOS();
  const showInstall = !hideInstall && !inst.installed && (inst.canPrompt || ios);
  if (!showReminder && !showInstall) return null;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-2 px-4 pt-3">
      {showReminder && (
        <div role="status" className="flex animate-pop items-center gap-3 rounded-2xl bg-[#ff9600] px-4 py-3 text-white" data-testid="reminder-banner">
          <span className="text-2xl" aria-hidden>
            ⏰
          </span>
          <button type="button" className="flex-1 text-left" onClick={onLearn}>
            <div className="font-black">{REMINDER_TEXT}</div>
            <div className="text-sm font-bold opacity-90">Hôm nay bạn chưa học. Học 1 bài để giữ chuỗi ngày nhé!</div>
          </button>
          <button type="button" aria-label="Ẩn nhắc nhở" onClick={() => setHideReminder(true)}>
            <Close size={20} />
          </button>
        </div>
      )}
      {showInstall && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-leaf-400 bg-leaf-50 px-4 py-3" data-testid="install-banner">
          <img src="./icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <div className="flex-1 text-sm font-bold text-ink-700">Cài ứng dụng lên màn hình chính để học nhanh hơn, cả khi offline.</div>
          {inst.canPrompt ? (
            <button type="button" className="chip !text-leaf-600" onClick={() => void promptInstall()} data-testid="install-button">
              Cài đặt
            </button>
          ) : (
            <IosInstallHint compact testid="ios-install-button" />
          )}
          <button
            type="button"
            aria-label="Ẩn"
            className="text-ink-300"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, '1');
              setHideInstall(true);
            }}
          >
            <Close size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
