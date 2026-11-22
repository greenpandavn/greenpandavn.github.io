/** Browsers in which the Web Speech voices do not work: Cốc Cốc and the in-app browsers of Zalo and Facebook/Messenger. */
export type UnsupportedBrowser = 'coccoc' | 'zalo' | 'facebook';

export function unsupportedBrowser(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): UnsupportedBrowser | null {
  if (/zalo/i.test(ua)) return 'zalo';
  if (/FBAN|FBAV|FB_IAB|Messenger/i.test(ua)) return 'facebook';
  if (/coc_coc|coccoc/i.test(ua)) return 'coccoc';
  return null;
}

export const NO_AUDIO_MSG = 'Bạn đang dùng trình duyệt không hỗ trợ âm thanh. Vui lòng dùng Chrome, Safari hoặc các trình duyệt chính khác.';

const SEEN_KEY = 'gp-browser-notice';
const flag = (key: string, set?: boolean) => {
  try {
    if (set) sessionStorage.setItem(key, '1');
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
/** The on-load notice is shown once per browser session. */
export const browserNoticeSeen = () => flag(SEEN_KEY);
export const markBrowserNoticeSeen = () => void flag(SEEN_KEY, true);
