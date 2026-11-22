import { describe, expect, it } from 'vitest';
import { unsupportedBrowser } from './browser';

const CHROME = 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

describe('unsupportedBrowser', () => {
  it('flags Cốc Cốc and the Zalo / Facebook / Messenger in-app browsers', () => {
    expect(unsupportedBrowser(`${CHROME} coc_coc_browser/126.0.0`)).toBe('coccoc');
    expect(unsupportedBrowser(CHROME.replace('Chrome/126.0.0.0', 'CocCoc/126 Chrome/126.0.0.0'))).toBe('coccoc');
    expect(unsupportedBrowser(`${CHROME} Zalo android/12100715 ZaloTheme/light ZaloLanguage/vi`)).toBe('zalo');
    expect(unsupportedBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/560')).toBe('zalo');
    expect(unsupportedBrowser(`${CHROME} [FB_IAB/FB4A;FBAV/470.0.0.0;]`)).toBe('facebook');
    expect(unsupportedBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/470.0;]')).toBe('facebook');
    expect(unsupportedBrowser(`${CHROME} Messenger/470`)).toBe('facebook');
  });
  it('leaves Chrome, Safari, Edge and Firefox alone', () => {
    for (const ua of [
      CHROME,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
      'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0',
    ])
      expect(unsupportedBrowser(ua)).toBeNull();
  });
});
