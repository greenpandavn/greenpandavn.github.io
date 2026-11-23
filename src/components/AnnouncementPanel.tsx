import { dismissAnnouncement, useAnnouncement } from '../lib/announcement';
import { Close } from './Icons';
import Panda from './Panda';

/** Compact "what's new" card above the bottom navigation; shown until closed, then only for a newer notice. */
export default function AnnouncementPanel() {
  const a = useAnnouncement();
  if (!a) return null;
  const lines = a.body.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-3" data-testid="announcement">
      <div className="pointer-events-auto w-full max-w-md animate-pop rounded-3xl border-2 border-leaf-500 bg-white p-4 text-left text-ink-700 shadow-xl" role="dialog" aria-label={a.title}>
        <div className="mb-2 flex items-start gap-3">
          <Panda size={44} mood="happy" />
          <div className="min-w-0 flex-1">
            {a.version && (
              <span className="rounded-full bg-leaf-500/15 px-2 py-0.5 text-xs font-black text-leaf-600" data-testid="announcement-version">
                Phiên bản {a.version}
              </span>
            )}
            <h3 className="mt-1 text-base font-black leading-tight" data-testid="announcement-title">
              {a.title}
            </h3>
          </div>
          <button type="button" aria-label="Đóng thông báo" onClick={dismissAnnouncement} data-testid="announcement-x">
            <Close size={22} />
          </button>
        </div>
        <ul className="max-h-[34dvh] space-y-1 overflow-y-auto text-sm font-bold text-ink-500" data-testid="announcement-body">
          {lines.map((l, i) =>
            /^[-•*]\s+/.test(l) ? (
              <li key={i} className="flex gap-2">
                <span className="text-leaf-600">•</span>
                <span>{l.replace(/^[-•*]\s+/, '')}</span>
              </li>
            ) : (
              <li key={i}>{l}</li>
            ),
          )}
        </ul>
        <button type="button" className="btn-green mt-3 w-full !min-h-[44px]" onClick={dismissAnnouncement} data-testid="announcement-close">
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
