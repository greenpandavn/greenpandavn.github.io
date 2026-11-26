import { describe, expect, it } from 'vitest';

import { DEFAULT_ANNOUNCEMENT } from './announcement';
import { unsupportedBrowser } from './browser';
import { APP_VERSION } from './version';

describe('v5.6.1 session fix', () => {
  it('announces the new domain', () => {
    expect(APP_VERSION).toMatch(/^5\.\d+\.\d+$/);
    expect(DEFAULT_ANNOUNCEMENT.body).toContain('greenpanda.vhphuoc.io.vn');
  });
  it('detects the Zalo and Facebook webviews that do not keep the login', () => {
    expect(unsupportedBrowser('Mozilla/5.0 (Linux; Android 13) Zalo android/12')).toBe('zalo');
    expect(unsupportedBrowser('Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/450.0]')).toBe('facebook');
    expect(unsupportedBrowser('Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36')).toBeNull();
  });
});
