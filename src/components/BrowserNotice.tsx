import type { ReactNode } from 'react';
import { NO_AUDIO_MSG, unsupportedBrowser } from '../lib/browser';
import { Close } from './Icons';

const HOW_TO: Record<string, ReactNode> = {
  zalo: (
    <>
      Trên Zalo: bấm nút menu <b>(⋯)</b> ở góc trên rồi chọn <b>“Mở bằng trình duyệt”</b>.
    </>
  ),
  facebook: (
    <>
      Trên Facebook/Messenger: bấm nút menu <b>(⋯)</b> ở góc trên rồi chọn <b>“Mở bằng trình duyệt”</b>.
    </>
  ),
  coccoc: (
    <>
      Trên Cốc Cốc: hãy mở link <b>greenpandavn.github.io</b> bằng <b>Chrome</b> hoặc <b>Safari</b>.
    </>
  ),
};

/**
 * Warning dialog for browsers without working voices. `load`: shown once per session when the app opens in
 * Cốc Cốc or an in-app browser. `audio`: shown when an audio button was tapped and nothing could be played.
 */
export default function BrowserNotice({ kind, extra, onClose }: { kind: 'load' | 'audio'; extra?: ReactNode; onClose: () => void }) {
  const browser = unsupportedBrowser();
  const title = kind === 'load' ? 'Trình duyệt không được hỗ trợ đầy đủ' : 'Không phát được âm thanh';
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-label={title} data-testid={`browser-notice-${kind}`}>
      <div className="w-full max-w-md animate-pop rounded-3xl bg-white p-5 text-left text-ink-700">
        <div className="mb-3 flex items-start gap-3">
          <h3 className="flex-1 text-lg font-black">{title}</h3>
          <button type="button" aria-label="Đóng" onClick={onClose} data-testid="browser-notice-x">
            <Close size={22} />
          </button>
        </div>
        <p className="text-sm font-bold" data-testid="browser-notice-text">
          {kind === 'load'
            ? 'GreenPanda hoạt động đầy đủ trên Chrome, Safari và các trình duyệt chính khác. Trình duyệt Cốc Cốc và trình duyệt trong ứng dụng Zalo không được hỗ trợ — bạn sẽ không nghe được phát âm.'
            : NO_AUDIO_MSG}
        </p>
        {kind === 'load' && (browser === 'zalo' || browser === 'facebook') && (
          <p className="mt-2 text-sm font-bold" data-testid="browser-notice-login">
            Trình duyệt này cũng không giữ đăng nhập lâu dài, bạn có thể bị đăng xuất. Hãy mở GreenPanda bằng Chrome.
          </p>
        )}
        {browser ? (
          <p className="mt-3 rounded-2xl bg-mist px-3 py-2 text-sm font-bold text-ink-500" data-testid="browser-notice-how">
            {kind === 'load' && browser !== 'coccoc' ? HOW_TO[browser] : kind === 'load' ? <>{HOW_TO.zalo} {HOW_TO.coccoc}</> : HOW_TO[browser]}
          </p>
        ) : (
          extra && (
            <p className="mt-3 rounded-2xl bg-mist px-3 py-2 text-sm font-bold text-ink-500" data-testid="browser-notice-how">
              {extra}
            </p>
          )
        )}
        <button type="button" className="btn-green mt-4 w-full" onClick={onClose} data-testid="browser-notice-close">
          {kind === 'load' ? 'Đã hiểu, tiếp tục' : 'Đã hiểu'}
        </button>
      </div>
    </div>
  );
}
