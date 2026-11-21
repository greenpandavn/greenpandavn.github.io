import { useState } from 'react';
import { isIOSSafari } from '../lib/install';
import { Close } from './Icons';

/** iOS has no automatic install prompt: this button opens the manual "Add to Home Screen" steps. */
export default function IosInstallHint({ compact = false, testid }: { compact?: boolean; testid: string }) {
  const [open, setOpen] = useState(false);
  const safari = isIOSSafari();
  return (
    <>
      <button type="button" className={compact ? 'chip !text-leaf-600' : 'btn-green'} onClick={() => setOpen(true)} data-testid={testid}>
        Cài đặt app
      </button>
      {!compact && <p className="text-sm font-bold text-ink-500">iPhone/iPad không có nút cài tự động — bấm để xem cách thêm app vào Màn hình chính.</p>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Cài đặt app trên iPhone/iPad" data-testid="ios-install-dialog" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md animate-pop rounded-3xl bg-white p-5 text-left text-ink-700" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              <img src="./icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
              <h3 className="flex-1 text-lg font-black">Cài đặt app trên iPhone/iPad</h3>
              <button type="button" aria-label="Đóng" onClick={() => setOpen(false)}>
                <Close size={22} />
              </button>
            </div>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm font-bold">
              <li>
                Mở trang <span className="text-leaf-600">greenpandavn.github.io</span> bằng <b>Safari</b>
                {safari ? ' (bạn đang dùng Safari rồi).' : ' — trình duyệt bạn đang dùng không cài được app, hãy mở lại bằng Safari.'}
              </li>
              <li>
                Bấm nút <b>Chia sẻ</b>{' '}
                <svg viewBox="0 0 24 24" width="18" height="18" className="inline -mt-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 15V3M8 7l4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
                </svg>{' '}
                (ô vuông có mũi tên hướng lên).
              </li>
              <li>
                Kéo xuống và chọn <b>“Thêm vào Màn hình chính”</b>.
              </li>
              <li>
                Bấm <b>“Thêm”</b> ở góc trên bên phải. Biểu tượng Gấu Trúc Xanh sẽ xuất hiện trên màn hình chính.
              </li>
            </ol>
            <button type="button" className="btn-green mt-4 w-full" onClick={() => setOpen(false)} data-testid="ios-install-close">
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
