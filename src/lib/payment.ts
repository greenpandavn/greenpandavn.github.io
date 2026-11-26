/**
 * v5.7.0 VIP purchase by bank transfer (VietQR). Nothing about the receiving account or the prices is in the code: an
 * admin sets them in config/payment. The learner picks a term, the app creates an order vipOrders/{code} whose code is
 * also the transfer content, and shows a VietQR for exactly that amount. An admin who sees the money in the bank app
 * confirms the order; that sets roles/{uid}.vipUntil. A bank webhook (Casso/SePay via a Cloud Function) can later do the
 * same confirmation on the same order documents: find vipOrders/{code}, check `amount`, write the same fields with
 * paidVia 'webhook'.
 */
export const VIP_PLANS = [1, 3, 6, 12] as const;
export type VipPlan = (typeof VIP_PLANS)[number];
export const planLabel = (m: number) => (m === 12 ? '1 năm' : `${m} tháng`);

export interface PaymentConfig {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  /** VND per term (months as the key); a missing or zero price means the term is not for sale. */
  prices: Partial<Record<string, number>>;
}
export const EMPTY_PAYMENT: PaymentConfig = { bankBin: '', bankName: '', accountNo: '', accountName: '', prices: {} };

/** Banks in the NAPAS 247 network (BIN used in VietQR). */
export const BANKS: [bin: string, name: string][] = [
  ['970436', 'Vietcombank'],
  ['970415', 'VietinBank'],
  ['970418', 'BIDV'],
  ['970405', 'Agribank'],
  ['970407', 'Techcombank'],
  ['970422', 'MB Bank'],
  ['970416', 'ACB'],
  ['970432', 'VPBank'],
  ['970423', 'TPBank'],
  ['970403', 'Sacombank'],
  ['970437', 'HDBank'],
  ['970441', 'VIB'],
  ['970443', 'SHB'],
  ['970431', 'Eximbank'],
  ['970426', 'MSB'],
  ['970448', 'OCB'],
  ['970440', 'SeABank'],
  ['970449', 'LPBank'],
  ['970428', 'Nam A Bank'],
  ['970409', 'Bac A Bank'],
  ['970425', 'ABBANK'],
  ['970412', 'PVcomBank'],
  ['970419', 'NCB'],
  ['970454', 'BVBank'],
];

export const MAX_PRICE = 100_000_000;
const validPrice = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= MAX_PRICE;

export function cleanPayment(raw: unknown): PaymentConfig {
  if (!raw || typeof raw !== 'object') return EMPTY_PAYMENT;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const prices: Record<string, number> = {};
  const rp = r.prices && typeof r.prices === 'object' ? (r.prices as Record<string, unknown>) : {};
  for (const m of VIP_PLANS) if (validPrice(rp[String(m)])) prices[String(m)] = rp[String(m)] as number;
  return { bankBin: str(r.bankBin), bankName: str(r.bankName), accountNo: str(r.accountNo), accountName: str(r.accountName), prices };
}

/** Receiving account complete enough to build a VietQR. */
export const accountReady = (c: PaymentConfig) => /^\d{6}$/.test(c.bankBin) && /^[0-9A-Za-z]{4,19}$/.test(c.accountNo) && c.accountName.length > 0;
/** Price of a term, 0 when it is not for sale. */
export const planPrice = (c: PaymentConfig, months: number) => (accountReady(c) ? c.prices[String(months)] ?? 0 : 0);

export const fmtVnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;

/** Order code = transfer content: "GP" + 6 characters of the uid + 6 random characters, e.g. GPAB12CDX7K9Q2. */
export function orderCode(uid: string, rand: () => number = Math.random) {
  const user = (uid.replace(/[^0-9a-z]/gi, '').toUpperCase() + '000000').slice(0, 6);
  const abc = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let r = '';
  for (let i = 0; i < 6; i++) r += abc[Math.floor(rand() * abc.length) % abc.length];
  return `GP${user}${r}`;
}
export const ORDER_CODE_RE = /^GP[A-Z0-9]{12}$/;

/** CRC-16/CCITT-FALSE, as required by EMVCo QR. */
export function crc16(s: string) {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(s)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
const tlv = (id: string, v: string) => `${id}${String(v.length).padStart(2, '0')}${v}`;

/** NAPAS VietQR (EMVCo) payload for a transfer of `amount` VND with `info` as the content. */
export function vietQrPayload(bin: string, accountNo: string, amount: number, info: string) {
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', accountNo)) + tlv('02', 'QRIBFTTA');
  const body =
    tlv('00', '01') + tlv('01', '12') + tlv('38', merchant) + tlv('53', '704') + tlv('54', String(Math.round(amount))) + tlv('58', 'VN') + tlv('62', tlv('08', info)) + '6304';
  return body + crc16(body);
}

export type OrderStatus = 'pending' | 'submitted' | 'paid' | 'rejected' | 'cancelled';
export interface VipOrder {
  code: string;
  uid: string;
  email: string;
  name: string;
  months: number;
  amount: number;
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  status: OrderStatus;
  createdAt: number;
  note: string;
  submittedAt: number;
  confirmedAt?: number;
  confirmedBy?: string;
  vipUntil?: number;
  paidVia?: 'manual' | 'webhook';
}
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ chuyển khoản',
  submitted: 'Chờ admin xác nhận',
  paid: 'Đã kích hoạt VIP',
  rejected: 'Bị từ chối',
  cancelled: 'Đã huỷ',
};
export const isOpen = (o: Pick<VipOrder, 'status'>) => o.status === 'pending' || o.status === 'submitted';
/** An unpaid order can be shown again only while it still matches the current price and account. */
export const orderMatches = (o: VipOrder, c: PaymentConfig, months: number) =>
  isOpen(o) && o.months === months && o.amount === planPrice(c, months) && o.bankBin === c.bankBin && o.accountNo === c.accountNo && o.accountName === c.accountName;
