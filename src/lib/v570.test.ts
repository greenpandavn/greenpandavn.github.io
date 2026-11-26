import { describe, expect, it } from 'vitest';

import { DEFAULT_ANNOUNCEMENT } from './announcement';
import { ORDER_CODE_RE, accountReady, cleanPayment, crc16, orderCode, orderMatches, planPrice, vietQrPayload, type VipOrder } from './payment';
import { APP_VERSION } from './version';

const cfg = cleanPayment({ bankBin: '970436', bankName: 'Vietcombank', accountNo: '0123456789', accountName: 'NGUYEN VAN A', prices: { '1': 50000, '3': 120000, '6': 0, '12': 'x' } });

describe('v5.7.0 VIP by bank transfer', () => {
  it('bumps the version and announces it', () => {
    expect(APP_VERSION).toBe('5.7.0');
    expect(DEFAULT_ANNOUNCEMENT.body).toContain('VietQR');
  });
  it('only sells terms with a valid price and a complete account', () => {
    expect(accountReady(cfg)).toBe(true);
    expect(planPrice(cfg, 1)).toBe(50000);
    expect(planPrice(cfg, 3)).toBe(120000);
    expect(planPrice(cfg, 6)).toBe(0);
    expect(planPrice(cfg, 12)).toBe(0);
    expect(planPrice(cleanPayment({ ...cfg, accountNo: '' }), 1)).toBe(0);
    expect(planPrice(cleanPayment(null), 1)).toBe(0);
  });
  it('makes order codes GP + uid + random that fit a transfer content', () => {
    const c = orderCode('aB3dE9fGhIjK');
    expect(c).toMatch(ORDER_CODE_RE);
    expect(c.slice(0, 8)).toBe('GPAB3DE9');
    expect(orderCode('x')).toMatch(ORDER_CODE_RE);
    expect(new Set(Array.from({ length: 200 }, () => orderCode('same-user'))).size).toBe(200);
  });
  it('builds a NAPAS VietQR payload with a valid CRC', () => {
    expect(crc16('123456789')).toBe('29B1');
    const p = vietQrPayload('970436', '0123456789', 50000, 'GPAB3DE9X7K9Q2');
    expect(p.startsWith('000201010212')).toBe(true);
    expect(p).toContain('0010A000000727');
    expect(p).toContain('0006970436');
    expect(p).toContain('01100123456789');
    expect(p).toContain('0208QRIBFTTA');
    expect(p).toContain('5303704540550000');
    expect(p).toContain('5802VN');
    expect(p).toContain('62180814GPAB3DE9X7K9Q2');
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
  });
  it('reuses an unpaid order only while price and account are unchanged', () => {
    const o = { months: 1, amount: 50000, bankBin: '970436', accountNo: '0123456789', accountName: 'NGUYEN VAN A', status: 'pending' } as VipOrder;
    expect(orderMatches(o, cfg, 1)).toBe(true);
    expect(orderMatches({ ...o, amount: 40000 }, cfg, 1)).toBe(false);
    expect(orderMatches({ ...o, status: 'paid' }, cfg, 1)).toBe(false);
    expect(orderMatches(o, { ...cfg, accountNo: '999999' }, 1)).toBe(false);
  });
});
