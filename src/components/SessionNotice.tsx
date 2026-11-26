import { setAccount } from '../lib/account';
import { unsupportedBrowser } from '../lib/browser';
import { Close } from './Icons';

/** v5.6.1: shown when an account that was signed in on this device lost its session without the learner logging out. */
export default function SessionNotice({ onLogin }: { onLogin: () => void }) {
  const webview = unsupportedBrowser();
  const close = () => setAccount({ sessionLost: false });
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-label="Phiên đăng nhập đã hết" data-testid="session-lost">
      <div className="w-full max-w-md animate-pop rounded-3xl bg-white p-5 text-left text-ink-700">
        <div className="mb-3 flex items-start gap-3">
          <h3 className="flex-1 text-lg font-black">Bạn đã bị đăng xuất</h3>
          <button type="button" aria-label="Đóng" onClick={close} data-testid="session-lost-x">
            <Close size={22} />
          </button>
        </div>
        <p className="text-sm font-bold" data-testid="session-lost-text">
          Phiên đăng nhập trên máy này đã hết, nên bạn đang học ở chế độ khách. Điểm và tiến độ trên tài khoản vẫn còn: hãy đăng nhập lại để tiếp tục và không bị mất điểm mới.
        </p>
        {webview === 'zalo' || webview === 'facebook' ? (
          <p className="mt-3 rounded-2xl bg-mist px-3 py-2 text-sm font-bold text-ink-500" data-testid="session-lost-webview">
            Trình duyệt trong {webview === 'zalo' ? 'Zalo' : 'Facebook/Messenger'} không giữ đăng nhập lâu dài. Bấm menu <b>(⋯)</b> → <b>“Mở bằng trình duyệt”</b> để mở GreenPanda bằng Chrome.
          </p>
        ) : null}
        <button
          type="button"
          className="btn-green mt-4 w-full"
          onClick={() => {
            close();
            onLogin();
          }}
          data-testid="session-lost-login"
        >
          Đăng nhập lại
        </button>
        <button type="button" className="btn-white mt-2 w-full" onClick={close} data-testid="session-lost-close">
          Để sau
        </button>
      </div>
    </div>
  );
}
